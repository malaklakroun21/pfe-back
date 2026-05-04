const sessionService = require('../services/session.service');
const ApiResponse = require('../utils/ApiResponse');

// POST /sessions/request
const requestSession = async (req, res, next) => {
  try {
    const session = await sessionService.requestSession(req.user, req.body);
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

// PATCH /sessions/:id/accept
const acceptSession = async (req, res, next) => {
  try {
    const session = await sessionService.acceptSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session accepted successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/reject
const rejectSession = async (req, res, next) => {
  try {
    const session = await sessionService.rejectSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session rejected successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/complete
const completeSession = async (req, res, next) => {
  try {
    const session = await sessionService.completeSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session completed successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestSession,
  listSessions,
  acceptSession,
  rejectSession,
  completeSession,
};
