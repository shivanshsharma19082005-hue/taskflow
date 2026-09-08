const express = require('express');
const { createUser, getUsers, getTeam, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getUsers);
router.get('/team', getTeam);
router.post('/', authorize('mainboss', 'admin'), createUser);
router.patch('/:id', authorize('mainboss', 'admin'), updateUser);
router.delete('/:id', authorize('mainboss', 'admin'), deleteUser);

module.exports = router;
