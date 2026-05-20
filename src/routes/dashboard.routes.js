const express = require('express');

const dashboardController = require('../controllers/dashboard.controller');
const protect = require('../middleware/auth.middleware');
const uploadProof = require('../middleware/uploadProof.middleware');

const router = express.Router();

router.use(protect);

router.get('/overview', dashboardController.getOverview);
router.get('/profile', dashboardController.getProfile);
router.get('/explore', dashboardController.getExploreDirectory);
router.get('/validation', dashboardController.getValidationData);
router.post(
  '/validation-requests',
  uploadProof,
  dashboardController.createValidationRequest
);

module.exports = router;
