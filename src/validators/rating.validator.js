const Joi = require('joi');

// Payload contract for POST /ratings.
const createRatingSchema = Joi.object({
  sessionId: Joi.string().trim().required(),
  toUserId: Joi.string().trim().required(),
  score: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().allow('').max(1000).optional(),
});

module.exports = {
  createRatingSchema,
};
