const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');

const populateOpts = [
  { path: 'assignedTo', select: 'name email role department manager' },
  { path: 'assignedBy', select: 'name email role department manager' },
  { path: 'comments.author', select: 'name role' },
];

// Emits one event to the union of the given rooms, guaranteeing each connected
// socket receives it exactly once even if it belongs to more than one of the
// listed rooms (e.g. a Main Boss's own "user:<id>" room can coincide with a
// target's "manager" room). Passing an array to io.to() de-duplicates by
// socket id internally, unlike issuing multiple separate io.to(...).emit() calls.
const broadcast = (io, roomsInput, event, payload) => {
  const rooms = [...new Set(roomsInput.filter(Boolean).map(String))];
  if (rooms.length === 0) return;
  io.to(rooms).emit(event, payload);
};

// Builds a "user:<id>" room name, or null if id is falsy (e.g. an orphaned
// employee whose admin was deleted has manager === null). Returning a real
// null - instead of the string "user:null" - lets broadcast()'s
// filter(Boolean) correctly drop it instead of silently creating a
// never-joined ghost room.
const userRoom = (id) => (id ? `user:${id}` : null);

// Determines whether `requester` is allowed to assign a task to `targetUser`
const canAssignTo = (requester, targetUser) => {
  if (requester.role === 'mainboss') {
    return ['admin', 'employee'].includes(targetUser.role);
  }
  if (requester.role === 'admin') {
    return targetUser.role === 'employee' && String(targetUser.manager) === String(requester._id);
  }
  return false; // employees cannot assign tasks
};

// @route POST /api/tasks
const createTask = async (req, res) => {
  try {
    const requester = req.user;
    const { title, description, assignedTo, priority, dueDate } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({ message: 'Title and assignedTo are required' });
    }
    if (requester.role === 'employee') {
      return res.status(403).json({ message: 'Employees cannot assign tasks' });
    }

    const targetUser = await User.findById(assignedTo);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ message: 'Assignee not found or inactive' });
    }
    if (!canAssignTo(requester, targetUser)) {
      return res.status(403).json({ message: 'You are not allowed to assign tasks to this user' });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: requester._id,
      priority: priority || 'medium',
      dueDate: dueDate || null,
    });

    await task.populate(populateOpts);

    const io = req.app.get('io');
    broadcast(
      io,
      [userRoom(assignedTo), userRoom(requester._id), userRoom(targetUser.manager), 'role:mainboss'],
      'task:created',
      task
    );

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Server error creating task', error: err.message });
  }
};

// @route GET /api/tasks
// Supports ?status=&priority=&assignedTo= filters
// mainboss -> all tasks
// admin    -> tasks they assigned + tasks assigned to their employees
// employee -> tasks assigned to them
const getTasks = async (req, res) => {
  try {
    const requester = req.user;
    const { status, priority, assignedTo } = req.query;

    let filter = {};

    if (requester.role === 'mainboss') {
      filter = {};
    } else if (requester.role === 'admin') {
      const employees = await User.find({ manager: requester._id }).select('_id');
      const employeeIds = employees.map((e) => e._id);
      // Admins should see: tasks they assigned out, tasks assigned to their
      // employees, AND tasks assigned directly to them (e.g. by the Main Boss).
      filter = {
        $or: [
          { assignedBy: requester._id },
          { assignedTo: { $in: employeeIds } },
          { assignedTo: requester._id },
        ],
      };
    } else {
      filter = { assignedTo: requester._id };
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
      filter = { ...filter, assignedTo };
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).populate(populateOpts);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching tasks', error: err.message });
  }
};

// @route GET /api/tasks/stats
// Lightweight aggregate counts for dashboards
const getStats = async (req, res) => {
  try {
    const requester = req.user;
    let matchStage = {};

    if (requester.role === 'mainboss') {
      matchStage = {};
    } else if (requester.role === 'admin') {
      const employees = await User.find({ manager: requester._id }).select('_id');
      const employeeIds = employees.map((e) => e._id);
      matchStage = {
        $or: [
          { assignedBy: requester._id },
          { assignedTo: { $in: employeeIds } },
          { assignedTo: requester._id },
        ],
      };
    } else {
      matchStage = { assignedTo: requester._id };
    }

    const results = await Task.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { pending: 0, 'in-progress': 0, completed: 0 };
    results.forEach((r) => {
      stats[r._id] = r.count;
    });
    stats.total = stats.pending + stats['in-progress'] + stats.completed;

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching stats', error: err.message });
  }
};

const loadTaskForRequester = async (req) => {
  const task = await Task.findById(req.params.id);
  if (!task) return { task: null };

  const requester = req.user;
  let allowed = false;

  if (requester.role === 'mainboss') {
    allowed = true;
  } else if (requester.role === 'admin') {
    const assignee = await User.findById(task.assignedTo);
    allowed =
      String(task.assignedBy) === String(requester._id) ||
      String(task.assignedTo) === String(requester._id) ||
      (assignee && String(assignee.manager) === String(requester._id));
  } else {
    allowed = String(task.assignedTo) === String(requester._id);
  }

  return { task, allowed };
};

// @route PATCH /api/tasks/:id/status
// The core "real-time task completion" endpoint. Employees move their own
// tasks through pending -> in-progress -> completed; admins/mainboss can too.
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const { task, allowed } = await loadTaskForRequester(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!allowed) return res.status(403).json({ message: 'You cannot update this task' });

    task.status = status;
    task.completedAt = status === 'completed' ? new Date() : null;
    await task.save();
    await task.populate(populateOpts);

    const io = req.app.get('io');
    broadcast(
      io,
      [userRoom(task.assignedTo._id), userRoom(task.assignedBy._id), userRoom(task.assignedTo.manager), 'role:mainboss'],
      'task:updated',
      task
    );

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating task status', error: err.message });
  }
};

// @route PATCH /api/tasks/:id
// Edit task details (title/description/priority/dueDate/reassign) - assigner or above only
const updateTask = async (req, res) => {
  try {
    const { task, allowed } = await loadTaskForRequester(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!allowed) return res.status(403).json({ message: 'You cannot edit this task' });
    if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Employees can only update task status, not details' });
    }

    const editable = ['title', 'description', 'priority', 'dueDate'];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    if (req.body.assignedTo && req.body.assignedTo !== String(task.assignedTo)) {
      const targetUser = await User.findById(req.body.assignedTo);
      if (!targetUser || !canAssignTo(req.user, targetUser)) {
        return res.status(403).json({ message: 'You are not allowed to reassign this task to that user' });
      }
      task.assignedTo = targetUser._id;
    }

    await task.save();
    await task.populate(populateOpts);

    const io = req.app.get('io');
    broadcast(
      io,
      [userRoom(task.assignedTo._id), userRoom(task.assignedBy._id), userRoom(task.assignedTo.manager), 'role:mainboss'],
      'task:updated',
      task
    );

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating task', error: err.message });
  }
};

// @route POST /api/tasks/:id/comments
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const { task, allowed } = await loadTaskForRequester(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!allowed) return res.status(403).json({ message: 'You cannot comment on this task' });

    task.comments.push({ author: req.user._id, text: text.trim() });
    await task.save();
    await task.populate(populateOpts);

    const io = req.app.get('io');
    broadcast(
      io,
      [userRoom(task.assignedTo._id), userRoom(task.assignedBy._id), userRoom(task.assignedTo.manager), 'role:mainboss'],
      'task:updated',
      task
    );

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Server error adding comment', error: err.message });
  }
};

// @route DELETE /api/tasks/:id
// Only the Main Boss can delete tasks — Admins and Employees never have this
// power, regardless of who assigned or is assigned the task.
const deleteTask = async (req, res) => {
  try {
    if (req.user.role !== 'mainboss') {
      return res.status(403).json({ message: 'Only the Main Boss can delete tasks' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const assignedToId = task.assignedTo;
    await task.deleteOne();

    const io = req.app.get('io');
    broadcast(io, [userRoom(assignedToId), userRoom(task.assignedBy), 'role:mainboss'], 'task:deleted', { id: task._id });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting task', error: err.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getStats,
  updateTaskStatus,
  updateTask,
  addComment,
  deleteTask,
};
