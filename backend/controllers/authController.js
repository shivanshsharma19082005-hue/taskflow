const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

// @route POST /api/auth/bootstrap-mainboss
// One-time setup endpoint: only works if there is no mainboss in the system yet.
// This lets a fresh deployment create its very first account without a chicken/egg problem.
const bootstrapMainBoss = async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'mainboss' });
    if (existing) {
      return res.status(403).json({ message: 'A Main Boss account already exists. Ask them to create your account.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const user = await User.create({ name, email, password, role: 'mainboss', manager: null });
    const token = generateToken(user);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error during bootstrap', error: err.message });
  }
};

module.exports = { login, getMe, bootstrapMainBoss };
