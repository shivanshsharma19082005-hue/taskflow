const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticates each incoming socket connection using the same JWT issued at login,
// then joins the socket to rooms so the server can target real-time events precisely:
//   user:<id>        -> events meant for exactly this person
//   role:mainboss     -> broadcast events meant for the mainboss dashboard
//   role:admin        -> broadcast events meant for admins
//   manager:<adminId>-> events for an admin's team, joined by that admin only
const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error('User not found or inactive'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);

    console.log(`[Socket.IO] ${user.name} (${user.role}) connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] ${user.name} disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
