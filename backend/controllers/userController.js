const User = require('../models/User');
const Task = require('../models/Task');

// @route POST /api/users
// mainboss -> can create 'admin' or 'employee'
// admin    -> can create 'employee' only, auto-assigned as their manager
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    const requester = req.user;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }

    if (requester.role === 'admin' && role !== 'employee') {
      return res.status(403).json({ message: 'Admins can only create employee accounts' });
    }
    if (requester.role === 'mainboss' && !['admin', 'employee'].includes(role)) {
      return res.status(403).json({ message: 'Main Boss can only create admin or employee accounts' });
    }
    if (requester.role === 'employee') {
      return res.status(403).json({ message: 'Employees cannot create accounts' });
    }

    // Determine manager assignment
    let manager = null;
    if (role === 'admin') {
      manager = requester.role === 'mainboss' ? requester._id : null;
    } else if (role === 'employee') {
      manager = requester._id; // whoever creates the employee becomes their manager
    }

    const user = await User.create({ name, email, password, role, department, manager });

    const io = req.app.get('io');
    // Use a single call with a de-duplicated room array so a socket that
    // matches both 'role:mainboss' and 'user:<manager>' (e.g. the Main Boss
    // creating an Admin, where manager === their own id) only gets one event.
    const rooms = [...new Set(['role:mainboss', manager ? `user:${manager}` : null].filter(Boolean).map(String))];
    io.to(rooms).emit('user:created', user.toSafeObject());

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error creating user', error: err.message });
  }
};

// @route GET /api/users
// mainboss -> everyone
// admin    -> their own employees (+ themselves)
// employee -> just themselves
const getUsers = async (req, res) => {
  try {
    const requester = req.user;
    let filter = {};

    if (requester.role === 'mainboss') {
      filter = {};
    } else if (requester.role === 'admin') {
      filter = { $or: [{ manager: requester._id }, { _id: requester._id }] };
    } else {
      filter = { _id: requester._id };
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching users', error: err.message });
  }
};

// @route GET /api/users/team
// Returns the org-chart style team relevant to the requester:
// mainboss -> all admins + all employees grouped by admin
// admin    -> their employees
const getTeam = async (req, res) => {
  try {
    const requester = req.user;

    if (requester.role === 'mainboss') {
      const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
      const employees = await User.find({ role: 'employee' }).sort({ createdAt: -1 });
      return res.json({
        admins: admins.map((a) => a.toSafeObject()),
        employees: employees.map((e) => e.toSafeObject()),
      });
    }

    if (requester.role === 'admin') {
      const employees = await User.find({ manager: requester._id }).sort({ createdAt: -1 });
      return res.json({ employees: employees.map((e) => e.toSafeObject()) });
    }

    return res.json({});
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching team', error: err.message });
  }
};

// @route PATCH /api/users/:id
const updateUser = async (req, res) => {
  try {
    const requester = req.user;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const canManage =
      requester.role === 'mainboss' ||
      (requester.role === 'admin' && String(target.manager) === String(requester._id)) ||
      String(target._id) === String(requester._id);

    if (!canManage) {
      return res.status(403).json({ message: 'You cannot modify this user' });
    }

    const allowedFields = ['name', 'department', 'isActive'];

    if (req.body.isActive !== undefined) {
      if (target.role === 'mainboss') {
        return res.status(403).json({ message: 'The Main Boss account cannot be deactivated' });
      }
      if (String(target._id) === String(requester._id)) {
        return res.status(403).json({ message: 'You cannot change your own active status' });
      }
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) target[field] = req.body[field];
    });

    await target.save();
    res.json({ user: target.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating user', error: err.message });
  }
};

// @route DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const requester = req.user;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const canDelete =
      requester.role === 'mainboss' ||
      (requester.role === 'admin' && String(target.manager) === String(requester._id));

    if (!canDelete) {
      return res.status(403).json({ message: 'You cannot remove this user' });
    }
    if (target.role === 'mainboss') {
      return res.status(403).json({ message: 'The Main Boss account cannot be removed' });
    }

    // Reassign or clean up tasks owned by / assigned to this user
    await Task.deleteMany({ assignedTo: target._id });

    // Tasks this user assigned to others must not be left pointing at a
    // deleted user (that would silently break "assigned by" for everyone
    // still looking at them). Hand those over to the Main Boss instead of
    // leaving a dangling reference.
    const mainBoss = await User.findOne({ role: 'mainboss' });
    if (mainBoss) {
      await Task.updateMany({ assignedBy: target._id }, { $set: { assignedBy: mainBoss._id } });
    }

    await User.deleteMany({ _id: target._id });
    // If deleting an admin, their employees become unmanaged (mainboss should reassign)
    if (target.role === 'admin') {
      await User.updateMany({ manager: target._id }, { $set: { manager: null } });
    }

    const io = req.app.get('io');
    io.emit('user:deleted', { id: target._id });

    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting user', error: err.message });
  }
};

module.exports = { createUser, getUsers, getTeam, updateUser, deleteUser };
