const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public
router.post('/login', authController.login);

// Protected
router.get('/me',              protect, authController.getMe);
router.put('/change-password', protect, authController.changePassword);

module.exports = router;