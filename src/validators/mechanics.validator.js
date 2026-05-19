const Joi = require('joi');

const confirmSessionSchema = Joi.object({
  sessionId: Joi.string().trim().required(),
  actualDuration: Joi.number().positive().max(4).optional(),
});

const createEndorsementSchema = Joi.object({
  toUserId: Joi.string().trim().required(),
  skillId: Joi.string().trim().optional(),
  sessionId: Joi.string().trim().optional(),
  projectId: Joi.string().trim().optional(),
  message: Joi.string().trim().max(500).allow('').optional(),
}).or('sessionId', 'projectId');

const assignSkillTierSchema = Joi.object({
  skillTier: Joi.string()
    .valid('STARTER', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')
    .required(),
});

const updateSkillPlatformsSchema = Joi.object({
  linkedPlatforms: Joi.array().items(Joi.string().trim().max(200)).max(10).default([]),
});

module.exports = {
  confirmSessionSchema,
  createEndorsementSchema,
  assignSkillTierSchema,
  updateSkillPlatformsSchema,
};
