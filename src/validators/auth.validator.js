const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().trim().max(50).optional(),
  lastName: Joi.string().trim().max(50).optional(),
  profilePicture: Joi.string().trim().uri().optional(),
  bio: Joi.string().max(500).optional(),
  countryId: Joi.string().trim().optional(),
  cityId: Joi.string().trim().optional(),
  languages: Joi.array().items(Joi.string().trim()).default([]),
  role: Joi.string().valid('LEARNER', 'MENTOR').default('LEARNER'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};
