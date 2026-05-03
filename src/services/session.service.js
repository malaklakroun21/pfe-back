const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const Session = require('../models/Session');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const creditService = require('./credit.service');

const SESSION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'];
const SESSION_ROLES = ['TEACHER', 'LEARNER'];

// Guards every service action that depends on req.user.
const ensureAuthenticatedUser = (user) => {
  if (!user?.userId) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return user;
};

const normalizeSessionId = (sessionId) => {
  const normalizedSessionId = sessionId?.trim();

  if (!normalizedSessionId) {
    throw new ApiError(400, 'Session id is required', 'VALIDATION_ERROR');
  }

  return normalizedSessionId;
};

// Keep participant payload lightweight when listing sessions.
const sanitizePublicUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePicture: user.profilePicture,
    role: user.role,
  };
};

// "Populate" teacher/learner using userId (string refs), not ObjectId refs.
const withPopulatedParticipants = async (sessions) => {
  const userIds = [...new Set(sessions.flatMap((session) => [session.teacherId, session.learnerId]))];
  const users = await User.find({ userId: { $in: userIds } })
    .select('userId firstName lastName profilePicture role')
    .lean();

  const userMap = new Map(users.map((user) => [user.userId, user]));

  return sessions.map((session) => {
    return {
      ...session,
      teacher: sanitizePublicUser(userMap.get(session.teacherId)),
      learner: sanitizePublicUser(userMap.get(session.learnerId)),
    };
  });
};

// Validates that requested teacher exists and can receive requests.
const ensureTeacherExists = async (teacherId) => {
  const teacher = await User.findOne({
    userId: teacherId,
    accountStatus: 'ACTIVE',
  });

  if (!teacher) {
    throw new ApiError(404, 'Teacher not found', 'USER_NOT_FOUND');
  }

  return teacher;
};

// Learner opens a new request-like session in PENDING state.
const requestSession = async (currentUser, payload) => {
  const learner = ensureAuthenticatedUser(currentUser);
  const teacherId = payload.teacherId.trim();

  if (learner.userId === teacherId) {
    throw new ApiError(400, 'You cannot request a session with yourself', 'VALIDATION_ERROR');
  }

  await ensureTeacherExists(teacherId);

  const session = await Session.create({
    sessionId: `SES-${randomUUID()}`,
    learnerId: learner.userId,
    teacherId,
    skill: payload.skill,
    duration: payload.duration,
    date: payload.date,
    message: payload.message || '',
    status: 'PENDING',
  });

  return session.toObject();
};

// Lists sessions for current user with optional role/status filters.
const listSessionsForUser = async (currentUser, query = {}) => {
  const user = ensureAuthenticatedUser(currentUser);
  const role = query.role?.trim().toUpperCase();
  const status = query.status?.trim().toUpperCase();
  const filter = {};

  if (role) {
    if (!SESSION_ROLES.includes(role)) {
      throw new ApiError(400, 'Invalid role filter', 'VALIDATION_ERROR');
    }

    filter[role === 'TEACHER' ? 'teacherId' : 'learnerId'] = user.userId;
  } else {
    filter.$or = [{ teacherId: user.userId }, { learnerId: user.userId }];
  }

  if (status) {
    if (!SESSION_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status filter', 'VALIDATION_ERROR');
    }

    filter.status = status;
  }

  const sessions = await Session.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  return withPopulatedParticipants(sessions);
};

const getSessionDocumentById = async (sessionId, options = {}) => {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const session = await Session.findOne(
    {
      sessionId: normalizedSessionId,
    },
    null,
    options
  );

  if (!session) {
    throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }

  return session;
};

// Only teacher can accept and only from PENDING.
const acceptSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const session = await getSessionDocumentById(sessionId);

  if (session.teacherId !== user.userId) {
    throw new ApiError(403, 'Only the teacher can accept this session', 'FORBIDDEN');
  }

  if (session.status !== 'PENDING') {
    throw new ApiError(409, 'Only pending sessions can be accepted', 'SESSION_INVALID_STATUS');
  }

  session.status = 'ACCEPTED';
  await session.save();

  return session.toObject();
};

// Only teacher can reject and only from PENDING.
const rejectSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const session = await getSessionDocumentById(sessionId);

  if (session.teacherId !== user.userId) {
    throw new ApiError(403, 'Only the teacher can reject this session', 'FORBIDDEN');
  }

  if (session.status !== 'PENDING') {
    throw new ApiError(409, 'Only pending sessions can be rejected', 'SESSION_INVALID_STATUS');
  }

  session.status = 'REJECTED';
  await session.save();

  return session.toObject();
};

// Completes session + transfers credits atomically in one DB transaction.
const completeSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const mongoSession = await mongoose.startSession();

  try {
    let completedSession;

    await mongoSession.withTransaction(async () => {
      const session = await getSessionDocumentById(sessionId, { session: mongoSession });

      if (session.teacherId !== user.userId && user.role !== 'ADMIN') {
        throw new ApiError(403, 'Only the teacher can complete this session', 'FORBIDDEN');
      }

      if (session.status === 'COMPLETED' || session.creditsTransferred) {
        throw new ApiError(409, 'Session has already been completed', 'SESSION_ALREADY_COMPLETED');
      }

      if (session.status !== 'ACCEPTED') {
        throw new ApiError(409, 'Only accepted sessions can be completed', 'SESSION_INVALID_STATUS');
      }

      // Transfer amount is based on session duration (1 hour = 1 credit).
      await creditService.transferCredits({
        fromUserId: session.learnerId,
        toUserId: session.teacherId,
        amount: session.duration,
        sessionId: session.sessionId,
        mongoSession,
      });

      session.status = 'COMPLETED';
      session.creditsTransferred = true;
      session.completedAt = new Date();
      await session.save({ session: mongoSession });

      completedSession = session.toObject();
    });

    return completedSession;
  } finally {
    await mongoSession.endSession();
  }
};

module.exports = {
  requestSession,
  listSessionsForUser,
  acceptSession,
  rejectSession,
  completeSession,
};
