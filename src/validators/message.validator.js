const Joi = require('joi');

const sendMessageSchema = Joi.object({
  recipientUserId: Joi.string().trim().required(),
  content: Joi.string().trim().min(1).max(5000).required(),
});

module.exports = {
  sendMessageSchema,
};
