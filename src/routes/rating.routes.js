const express = require('express');

const ratingController = require('../controllers/rating.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createRatingSchema } = require('../validators/rating.validator');

const router = express.Router();

router.use(protect);

// Participant submits rating for a completed session.
router.post('/', validate(createRatingSchema), ratingController.createRating);

module.exports = router;
