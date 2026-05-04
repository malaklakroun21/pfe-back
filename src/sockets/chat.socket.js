const messageService = require('../services/message.service');

const getAcknowledge = (maybeAck) => {
  return typeof maybeAck === 'function' ? maybeAck : null;
};

const emitSocketError = (ack, error) => {
  const payload = {
    success: false,
    error: {
      code: error.code || 'SOCKET_ERROR',
      message: error.message || 'Unexpected socket error',
    },
  };

  if (ack) {
    ack(payload);
  }
};

const registerChatSocket = (io, socket) => {
  // Client emits: chat:send { recipientUserId, content }
  socket.on('chat:send', async (payload = {}, maybeAck) => {
    const ack = getAcknowledge(maybeAck);

    try {
      const result = await messageService.sendMessage(socket.user, payload);
      const messageEvent = {
        success: true,
        data: result,
      };

      // Deliver to sender and recipient (each user has a personal room).
      io.to(`user:${socket.user.userId}`).emit('chat:message', messageEvent.data);
      io.to(`user:${payload.recipientUserId}`).emit('chat:message', messageEvent.data);

      if (ack) {
        ack(messageEvent);
      }
    } catch (error) {
      emitSocketError(ack, error);
    }
  });

  // Client emits: chat:read { messageId }
  socket.on('chat:read', async (payload = {}, maybeAck) => {
    const ack = getAcknowledge(maybeAck);

    try {
      const readMessage = await messageService.markMessageAsRead(socket.user, payload.messageId);
      const eventPayload = {
        success: true,
        data: readMessage,
      };

      io.to(`user:${socket.user.userId}`).emit('chat:read:update', readMessage);

      if (ack) {
        ack(eventPayload);
      }
    } catch (error) {
      emitSocketError(ack, error);
    }
  });
};

module.exports = registerChatSocket;
