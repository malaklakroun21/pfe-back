const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Z])(?=.*\d)/)
    .message('Password must contain at least one uppercase letter and one number')
    .required(),
  role: Joi.string().valid('user', 'mentor').default('user'),
  bio: Joi.string().max(500).optional(),
  avatar: Joi.string().trim().uri().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};
