const Joi = require('joi');

const createSessionSchema = Joi.object({
  requestId: Joi.string().trim().optional(),
  providerUserId: Joi.string().trim().optional(),
  skillId: Joi.string().trim().optional(),
  skillName: Joi.string().trim().max(120).optional(),
  proficiencyLevel: Joi.string()
    .trim()
    .uppercase()
    .valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')
    .optional(),
  preferredDuration: Joi.number().positive().optional(),
  description: Joi.string().trim().allow('').max(500).optional(),
  yearsOfExperience: Joi.number().min(0).optional(),
  scheduledDate: Joi.date().iso().optional(),
  startTime: Joi.date().iso().optional(),
  endTime: Joi.date().iso().optional(),
  creditsExchanged: Joi.number().positive().optional(),
}).or('requestId', 'skillId', 'skillName');

module.exports = {
  createSessionSchema,
};
