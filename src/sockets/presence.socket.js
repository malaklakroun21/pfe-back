const { presenceLookupSocketSchema } = require('../validators/socket.validator');
const { getPresenceState } = require('./presence.service');
const {
  emitSocketError,
  emitSocketSuccess,
  enforceSocketRateLimit,
  getPayloadAndAcknowledge,
  validateSocketPayload,
} = require('./socket.utils');

const PRESENCE_RATE_LIMIT = {
  limit: 20,
  windowMs: 10000,
};

const registerPresenceSocket = (socket) => {
  socket.on('presence:get', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'presence:get', PRESENCE_RATE_LIMIT);
      const payload = validateSocketPayload(presenceLookupSocketSchema, rawPayload);
      const presenceItems = getPresenceState(payload.userIds);
      emitSocketSuccess(ack, presenceItems);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });
};

module.exports = registerPresenceSocket;
