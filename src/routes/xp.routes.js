const express = require('express');

const xpController = require('../controllers/xp.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

// Read-only XP endpoints — no mutation routes (XP is granted by trusted server flows only).
router.get('/me', protect, xpController.getMyXp);
router.get('/:userId', protect, xpController.getUserXp);

module.exports = router;
