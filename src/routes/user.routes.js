const express = require('express');
const router = express.Router();

const protect = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

router.get('/me', protect, userController.getMe);

module.exports = router;
