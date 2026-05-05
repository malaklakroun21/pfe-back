const messageService = require('../services/message.service');
const {
  chatConversationLookupSchema,
  chatReadSocketSchema,
  chatSendSocketSchema,
} = require('../validators/socket.validator');
const { emitChatMessage, emitChatReadUpdate } = require('./gateway');
const {
  emitSocketError,
  emitSocketSuccess,
  enforceSocketRateLimit,
  getPayloadAndAcknowledge,
  validateSocketPayload,
} = require('./socket.utils');

const RATE_LIMITS = {
  send: {
    limit: 10,
    windowMs: 10000,
  },
  read: {
    limit: 30,
    windowMs: 10000,
  },
  sync: {
    limit: 20,
    windowMs: 10000,
  },
};

const registerChatSocket = (io, socket) => {
  socket.on('chat:send', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'chat:send', RATE_LIMITS.send);
      const payload = validateSocketPayload(chatSendSocketSchema, rawPayload);
      const result = await messageService.sendMessage(socket.user, payload);

      emitChatMessage(
        {
          senderUserId: socket.user.userId,
          recipientUserId: payload.recipientUserId,
          payload: result,
        },
        io
      );

      emitSocketSuccess(ack, result);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('chat:read', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'chat:read', RATE_LIMITS.read);
      const payload = validateSocketPayload(chatReadSocketSchema, rawPayload);
      const readMessage = await messageService.markMessageAsRead(socket.user, payload.messageId);
      const participantUserIds = await messageService.getConversationParticipantUserIds(
        readMessage.conversationId
      );

      emitChatReadUpdate(
        {
          participantUserIds,
          payload: readMessage,
        },
        io
      );

      emitSocketSuccess(ack, readMessage);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('chat:listConversations', async (payloadOrAck, maybeAck) => {
    const { ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'chat:listConversations', RATE_LIMITS.sync);
      const conversations = await messageService.listConversations(socket.user);
      emitSocketSuccess(ack, conversations);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('chat:getConversation', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'chat:getConversation', RATE_LIMITS.sync);
      const payload = validateSocketPayload(chatConversationLookupSchema, rawPayload);
      const conversation = await messageService.getConversationWithUser(socket.user, payload.userId);
      emitSocketSuccess(ack, conversation);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });
};

module.exports = registerChatSocket;
