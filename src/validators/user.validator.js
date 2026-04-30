const Joi = require('joi');

const updateMeSchema = Joi.object({
  name: Joi.string().trim().max(101).optional(),
  firstName: Joi.string().trim().max(50).optional(),
  lastName: Joi.string().trim().max(50).optional(),
  bio: Joi.string().allow('').max(500).optional(),
  photo: Joi.string().trim().uri().optional(),
  profilePicture: Joi.string().trim().uri().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

module.exports = {
  updateMeSchema,
};
