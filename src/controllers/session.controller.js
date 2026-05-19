const sessionService = require('../services/session.service');
const ApiResponse = require('../utils/ApiResponse');
const { emitSessionUpdate } = require('../sockets/gateway');

// POST /sessions/request
const requestSession = async (req, res, next) => {
  try {
    const session = await sessionService.requestSession(req.user, req.body);
    emitSessionUpdate(session);
    res.status(201).json(new ApiResponse(201, session, 'Session requested successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /sessions
const listSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.listSessionsForUser(req.user, req.query);
    res.status(200).json(new ApiResponse(200, sessions, 'Sessions fetched successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /sessions/explore
const listSessionsDirectory = async (req, res, next) => {
  try {
    const sessions = await sessionService.listSessionsDirectory(req.user, req.query);
    res.status(200).json(new ApiResponse(200, sessions, 'Sessions directory fetched successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/accept
const acceptSession = async (req, res, next) => {
  try {
    const session = await sessionService.acceptSession(req.user, req.params.id);
    emitSessionUpdate(session);
    res.status(200).json(new ApiResponse(200, session, 'Session accepted successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/reject
const rejectSession = async (req, res, next) => {
  try {
    const session = await sessionService.rejectSession(req.user, req.params.id);
    emitSessionUpdate(session);
    res.status(200).json(new ApiResponse(200, session, 'Session rejected successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/cancel
const cancelSession = async (req, res, next) => {
  try {
    const session = await sessionService.cancelSession(req.user, req.params.id);
    emitSessionUpdate(session);
    res.status(200).json(new ApiResponse(200, session, 'Session request cancelled successfully'));
  } catch (error) {
    next(error);
  }
};

// DELETE /sessions/:id
const deleteSession = async (req, res, next) => {
  try {
    const session = await sessionService.deleteSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session deleted successfully'));
  } catch (error) {
    next(error);
  }
};

// POST /sessions/confirm — dual confirmation flow.
const confirmSession = async (req, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.params.id;
    const session = await sessionService.confirmSessionCompletion(req.user, sessionId, req.body);
    emitSessionUpdate(session);
    res.status(200).json(new ApiResponse(200, session, 'Session confirmation recorded successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/complete — backward compatible (teacher confirm).
const completeSession = async (req, res, next) => {
  try {
    const session = await sessionService.completeSession(req.user, req.params.id, req.body);
    emitSessionUpdate(session);
    res.status(200).json(new ApiResponse(200, session, 'Session completed successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestSession,
  listSessions,
  listSessionsDirectory,
  acceptSession,
  rejectSession,
  cancelSession,
  deleteSession,
  confirmSession,
  completeSession,
};
