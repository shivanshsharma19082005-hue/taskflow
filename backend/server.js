require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const initSocket = require('./sockets/socketHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

app.set('io', io);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (catches anything thrown synchronously in routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

initSocket(io);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[Server] Task Manager API running on port ${PORT}`);
  });
};

start();
