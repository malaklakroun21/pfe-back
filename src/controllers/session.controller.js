const sessionService = require('../services/session.service');
const ApiResponse = require('../utils/ApiResponse');

const createSession = async (req, res, next) => {
  try {
    const session = await sessionService.createSession(req.user, req.body);
    res.status(201).json(new ApiResponse(201, session, 'Session created successfully'));
  } catch (error) {
    next(error);
  }
};

const cancelSession = async (req, res, next) => {
  try {
    const session = await sessionService.cancelSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session cancelled successfully'));
  } catch (error) {
    next(error);
  }
};

const acceptSession = async (req, res, next) => {
  try {
    const session = await sessionService.acceptSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session accepted successfully'));
  } catch (error) {
    next(error);
  }
};

const rejectSession = async (req, res, next) => {
  try {
    const session = await sessionService.rejectSession(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, session, 'Session rejected successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  cancelSession,
  acceptSession,
  rejectSession,
};
