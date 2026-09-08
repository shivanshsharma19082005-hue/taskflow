const express = require('express');
const {
  createTask,
  getTasks,
  getStats,
  updateTaskStatus,
  updateTask,
  addComment,
  deleteTask,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getTasks);
router.get('/stats', getStats);
router.post('/', authorize('mainboss', 'admin'), createTask);
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id', authorize('mainboss', 'admin'), updateTask);
router.post('/:id/comments', addComment);
router.delete('/:id', authorize('mainboss'), deleteTask);

module.exports = router;
