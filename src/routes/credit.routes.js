const express = require('express');

const creditController = require('../controllers/credit.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/me', creditController.getMyCredits);
router.get('/history', creditController.getCreditHistory);

module.exports = router;
