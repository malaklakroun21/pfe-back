const Joi = require('joi');

// Payload contract for POST /sessions/request.
const createSessionRequestSchema = Joi.object({
  teacherId: Joi.string().trim().required(),
  skill: Joi.string().trim().min(2).max(120).required(),
  duration: Joi.number().positive().required(),
  date: Joi.date().iso().required(),
  message: Joi.string().trim().allow('').max(1000).optional(),
});

// Payload contract for PATCH /sessions/:id/complete.
const completeSessionSchema = Joi.object({
  actualDuration: Joi.number().positive().optional(),
});

module.exports = {
  createSessionRequestSchema,
  completeSessionSchema,
};
