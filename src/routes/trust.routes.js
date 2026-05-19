const express = require('express');

const trustController = require('../controllers/trust.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/:userId', trustController.getUserTrust);

module.exports = router;
