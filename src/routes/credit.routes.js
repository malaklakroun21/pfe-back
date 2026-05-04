const express = require('express');

const creditController = require('../controllers/credit.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// Returns transactions where user is sender or receiver.
router.get('/history', creditController.getCreditHistory);

module.exports = router;
