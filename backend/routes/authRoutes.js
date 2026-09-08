const express = require('express');
const { login, getMe, bootstrapMainBoss } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/bootstrap-mainboss', bootstrapMainBoss);
router.get('/me', protect, getMe);

module.exports = router;
