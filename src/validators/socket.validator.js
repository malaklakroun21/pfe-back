const Joi = require('joi');

const { sendMessageSchema } = require('./message.validator');
const { createSessionRequestSchema } = require('./session.validator');

const chatSendSocketSchema = sendMessageSchema;

const chatReadSocketSchema = Joi.object({
  messageId: Joi.string().trim().required(),
});

const chatConversationLookupSchema = Joi.object({
  userId: Joi.string().trim().required(),
});

const sessionActionSocketSchema = Joi.object({
  sessionId: Joi.string().trim().required(),
});

const sessionCompleteSocketSchema = sessionActionSocketSchema.keys({
  actualDuration: Joi.number().positive().optional(),
});

const sessionListSocketSchema = Joi.object({
  role: Joi.string().trim().uppercase().valid('TEACHER', 'LEARNER').optional(),
  status: Joi.string().trim().uppercase().valid('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED').optional(),
});

const presenceLookupSocketSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().trim()).min(1).max(100).required(),
});

module.exports = {
  chatSendSocketSchema,
  chatReadSocketSchema,
  chatConversationLookupSchema,
  sessionActionSocketSchema,
  sessionCompleteSocketSchema,
  sessionListSocketSchema,
  sessionRequestSocketSchema: createSessionRequestSchema,
  presenceLookupSocketSchema,
};
