const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const creditRoutes = require('./credit.routes');
const dashboardRoutes = require('./dashboard.routes');
const messageRoutes = require('./message.routes');
const notificationRoutes = require('./notification.routes');
const projectRoutes = require('./project.routes');
const ratingRoutes = require('./rating.routes');
const sessionRoutes = require('./session.routes');
const userRoutes = require('./user.routes');
const validationRoutes = require('./validation.routes');
const xpRoutes = require('./xp.routes');
const trustRoutes = require('./trust.routes');
const endorsementRoutes = require('./endorsement.routes');
const skillsRoutes = require('./skills.routes');

router.use('/auth', authRoutes);
router.use('/credits', creditRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/projects', projectRoutes);
// New feature modules.
router.use('/ratings', ratingRoutes);
router.use('/sessions', sessionRoutes);
router.use('/users', userRoutes);
router.use('/validation', validationRoutes);
router.use('/xp', xpRoutes);
router.use('/trust', trustRoutes);
router.use('/endorsements', endorsementRoutes);
router.use('/skills', skillsRoutes);

router.get('/', (req, res) => {
  res.json({ success: true, message: 'API v1 is running' });
});

module.exports = router;
