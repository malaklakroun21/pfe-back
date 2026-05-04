const Joi = require('joi');

const adminRoleSchema = Joi.string().trim().valid('user', 'admin', 'LEARNER', 'MENTOR', 'ADMIN');

const updateUserByAdminSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).optional(),
  email: Joi.string().email().trim().lowercase().optional(),
  role: adminRoleSchema.optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

const updateRoleSchema = Joi.object({
  role: adminRoleSchema.required(),
});

module.exports = {
  updateUserByAdminSchema,
  updateRoleSchema,
};
