const express = require('express');
const router = express.Router();

// Import route modules
// const authRoutes = require('./auth.routes');
// const userRoutes = require('./user.routes');

// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);

router.get('/', (req, res) => {
res.json({ success: true, message: 'API v1 is running' });
});

module.exports = router;