const ApiError = require('../utils/ApiError');

const getAcknowledge = (maybeAck) => {
  return typeof maybeAck === 'function' ? maybeAck : null;
};

const getPayloadAndAcknowledge = (payloadOrAck, maybeAck) => {
  return {
    payload: typeof payloadOrAck === 'function' || payloadOrAck === undefined ? {} : payloadOrAck,
    ack: getAcknowledge(payloadOrAck) || getAcknowledge(maybeAck),
  };
};

const emitSocketError = (socket, ack, error) => {
  const payload = {
    success: false,
    error: {
      code: error.code || 'SOCKET_ERROR',
      message: error.message || 'Unexpected socket error',
    },
  };

  if (ack) {
    ack(payload);
    return;
  }

  socket.emit('socket:error', payload);
};

const emitSocketSuccess = (ack, data) => {
  if (ack) {
    ack({
      success: true,
      data,
    });
  }
};

const validateSocketPayload = (schema, payload = {}) => {
  if (!schema) {
    return payload;
  }

  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new ApiError(
      400,
      error.details.map((detail) => detail.message).join(', '),
      'VALIDATION_ERROR'
    );
  }

  return value;
};

const getRateLimitStore = (socket) => {
  if (!socket.data) {
    socket.data = {};
  }

  if (!socket.data.__rateLimitStore) {
    socket.data.__rateLimitStore = new Map();
  }

  return socket.data.__rateLimitStore;
};

const enforceSocketRateLimit = (socket, key, { limit, windowMs }) => {
  if (!limit || !windowMs) {
    return;
  }

  const store = getRateLimitStore(socket);
  const now = Date.now();
  const timestamps = (store.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

  if (timestamps.length >= limit) {
    throw new ApiError(
      429,
      `Rate limit exceeded for ${key}. Please slow down.`,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  timestamps.push(now);
  store.set(key, timestamps);
};

module.exports = {
  getAcknowledge,
  getPayloadAndAcknowledge,
  emitSocketError,
  emitSocketSuccess,
  validateSocketPayload,
  enforceSocketRateLimit,
};
