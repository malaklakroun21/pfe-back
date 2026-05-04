const ratingService = require('../services/rating.service');
const ApiResponse = require('../utils/ApiResponse');

// POST /ratings
const createRating = async (req, res, next) => {
  try {
    const rating = await ratingService.createRating(req.user, req.body);
    res.status(201).json(new ApiResponse(201, rating, 'Rating submitted successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRating,
};
