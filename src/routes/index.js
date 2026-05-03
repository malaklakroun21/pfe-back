const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const messageRoutes = require('./message.routes');
const projectRoutes = require('./project.routes');
const sessionRoutes = require('./session.routes');
const userRoutes = require('./user.routes');

router.use('/auth', authRoutes);
router.use('/messages', messageRoutes);
router.use('/projects', projectRoutes);
router.use('/sessions', sessionRoutes);
router.use('/users', userRoutes);

router.get('/', (req, res) => {
  res.json({ success: true, message: 'API v1 is running' });
});

module.exports = router;
