const sessionService = require('../services/session.service');
const {
  sessionActionSocketSchema,
  sessionCompleteSocketSchema,
  sessionListSocketSchema,
  sessionRequestSocketSchema,
} = require('../validators/socket.validator');
const { emitSessionUpdate } = require('./gateway');
const {
  emitSocketError,
  emitSocketSuccess,
  enforceSocketRateLimit,
  getPayloadAndAcknowledge,
  validateSocketPayload,
} = require('./socket.utils');

const RATE_LIMITS = {
  list: {
    limit: 20,
    windowMs: 10000,
  },
  request: {
    limit: 5,
    windowMs: 60000,
  },
  update: {
    limit: 10,
    windowMs: 10000,
  },
};

const registerSessionSocket = (io, socket) => {
  socket.on('session:list', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'session:list', RATE_LIMITS.list);
      const payload = validateSocketPayload(sessionListSocketSchema, rawPayload);
      const sessions = await sessionService.listSessionsForUser(socket.user, payload);
      emitSocketSuccess(ack, sessions);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('session:request', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'session:request', RATE_LIMITS.request);
      const payload = validateSocketPayload(sessionRequestSocketSchema, rawPayload);
      const session = await sessionService.requestSession(socket.user, payload);
      emitSessionUpdate(session, io);
      emitSocketSuccess(ack, session);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('session:accept', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'session:accept', RATE_LIMITS.update);
      const payload = validateSocketPayload(sessionActionSocketSchema, rawPayload);
      const session = await sessionService.acceptSession(socket.user, payload.sessionId);
      emitSessionUpdate(session, io);
      emitSocketSuccess(ack, session);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('session:reject', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'session:reject', RATE_LIMITS.update);
      const payload = validateSocketPayload(sessionActionSocketSchema, rawPayload);
      const session = await sessionService.rejectSession(socket.user, payload.sessionId);
      emitSessionUpdate(session, io);
      emitSocketSuccess(ack, session);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });

  socket.on('session:complete', async (payloadOrAck, maybeAck) => {
    const { payload: rawPayload, ack } = getPayloadAndAcknowledge(payloadOrAck, maybeAck);

    try {
      enforceSocketRateLimit(socket, 'session:complete', RATE_LIMITS.update);
      const payload = validateSocketPayload(sessionCompleteSocketSchema, rawPayload);
      const session = await sessionService.completeSession(socket.user, payload.sessionId, {
        actualDuration: payload.actualDuration,
      });
      emitSessionUpdate(session, io);
      emitSocketSuccess(ack, session);
    } catch (error) {
      emitSocketError(socket, ack, error);
    }
  });
};

module.exports = registerSessionSocket;
