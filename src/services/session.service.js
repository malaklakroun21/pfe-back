const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const Session = require('../models/Session');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const creditService = require('./credit.service');
const xpService = require('./xp.service');
const skillService = require('./skill.service');
const trustScoreService = require('./trustScore.service');
const { ensureTeacherCanTeachSkill } = require('./validation.service');
const { MAX_SESSION_HOURS, SKILL_TIER_MULTIPLIERS } = require('../constants/mechanics');

const SESSION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'];
const SESSION_ROLES = ['TEACHER', 'LEARNER'];

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

const parsePositiveDuration = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, `${fieldName} must be greater than 0`, 'VALIDATION_ERROR');
  }

  if (parsed > MAX_SESSION_HOURS) {
    throw new ApiError(400, `Maximum session duration is ${MAX_SESSION_HOURS} hours`, 'VALIDATION_ERROR');
  }

  return parsed;
};

const resolveBillableHours = (scheduledDuration, rawActualDuration) => {
  const actualDuration =
    parsePositiveDuration(rawActualDuration, 'actualDuration') ?? scheduledDuration;
  const cappedActual = Math.min(actualDuration, MAX_SESSION_HOURS);
  const cappedScheduled = Math.min(scheduledDuration, MAX_SESSION_HOURS);
  const billableHours = Math.min(cappedScheduled, cappedActual);

  return {
    actualDuration: cappedActual,
    billableHours,
  };
};

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

const withPopulatedParticipants = async (sessions) => {
  const userIds = [...new Set(sessions.flatMap((session) => [session.teacherId, session.learnerId]))];
  const users = await User.find({ userId: { $in: userIds } })
    .select('userId firstName lastName profilePicture role')
    .lean();

  const userMap = new Map(users.map((user) => [user.userId, user]));

  return sessions.map((session) => ({
    ...session,
    teacher: sanitizePublicUser(userMap.get(session.teacherId)),
    learner: sanitizePublicUser(userMap.get(session.learnerId)),
  }));
};

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

const getSessionDocumentById = async (sessionId, options = {}) => {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const session = await Session.findOne({ sessionId: normalizedSessionId }, null, options);

  if (!session) {
    throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }

  return session;
};

const getParticipantRole = (session, userId) => {
  if (session.teacherId === userId) {
    return 'TEACHER';
  }

  if (session.learnerId === userId) {
    return 'LEARNER';
  }

  return null;
};

// Settles credits + XP after BOTH participants confirmed completion.
const finalizeSessionSettlement = async (session, mongoSession) => {
  if (session.creditsTransferred) {
    return session;
  }

  const { actualDuration, billableHours } = resolveBillableHours(
    session.duration,
    session.actualDuration || session.duration
  );

  const teacherSkill = await skillService.findTeacherSkillForSession(
    session.teacherId,
    session.skill
  );

  const skillTier = teacherSkill?.skillTier || 'STARTER';
  const trustModifier = teacherSkill?.trustModifier || 1;

  const calculatedCredits = creditService.calculateCredits({
    hours: billableHours,
    skillTier,
    trustModifier,
  });

  await creditService.validateWeeklyCap({
    teacherId: session.teacherId,
    amount: calculatedCredits,
    trustBadge: teacherSkill?.trustBadge || 'Unverified',
    mongoSession,
  });

  await creditService.transferCredits({
    fromUserId: session.learnerId,
    toUserId: session.teacherId,
    amount: calculatedCredits,
    sessionId: session.sessionId,
    mongoSession,
  });

  session.actualDuration = actualDuration;
  session.chargedCredits = calculatedCredits;
  session.creditBreakdown = {
    hours: billableHours,
    skillTier,
    tierMultiplier: SKILL_TIER_MULTIPLIERS[skillTier] || 1,
    trustModifier,
    calculatedCredits,
  };
  session.status = 'COMPLETED';
  session.creditsTransferred = true;
  session.endorsementsUnlocked = true;
  session.completedAt = new Date();

  if (!session.xpAwarded) {
    await xpService.awardSessionCompletionXP({
      teacherId: session.teacherId,
      creditsEarned: calculatedCredits,
      sessionId: session.sessionId,
      skill: session.skill,
      mongoSession,
    });
    session.xpAwarded = true;
  }

  if (teacherSkill) {
    await trustScoreService.recalculateSkillTrust(teacherSkill);
  }

  return session;
};

const requestSession = async (currentUser, payload) => {
  const learner = ensureAuthenticatedUser(currentUser);
  const teacherId = payload.teacherId.trim();
  const duration = parsePositiveDuration(payload.duration, 'duration');

  if (learner.userId === teacherId) {
    throw new ApiError(400, 'You cannot request a session with yourself', 'VALIDATION_ERROR');
  }

  await ensureTeacherExists(teacherId);
  await ensureTeacherCanTeachSkill(teacherId, payload.skill);

  const session = await Session.create({
    sessionId: `SES-${randomUUID()}`,
    learnerId: learner.userId,
    teacherId,
    skill: payload.skill,
    duration,
    date: payload.date,
    message: payload.message || '',
    status: 'PENDING',
  });

  return session.toObject();
};

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

const listSessionsDirectory = async (currentUser, query = {}) => {
  ensureAuthenticatedUser(currentUser);
  const status = query.status?.trim().toUpperCase();
  const filter = {};

  if (status && status !== 'ALL') {
    if (!SESSION_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status filter', 'VALIDATION_ERROR');
    }

    filter.status = status;
  }

  const sessions = await Session.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  return withPopulatedParticipants(sessions);
};

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

const cancelSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const session = await getSessionDocumentById(sessionId);

  if (session.learnerId !== user.userId) {
    throw new ApiError(403, 'Only the learner can cancel this session request', 'FORBIDDEN');
  }

  if (session.status !== 'PENDING') {
    throw new ApiError(409, 'Only pending sessions can be cancelled', 'SESSION_INVALID_STATUS');
  }

  session.status = 'REJECTED';
  await session.save();

  return session.toObject();
};

const deleteSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const session = await getSessionDocumentById(sessionId);

  if (session.teacherId !== user.userId && session.learnerId !== user.userId) {
    throw new ApiError(403, 'Only a session participant can delete this session', 'FORBIDDEN');
  }

  if (session.status === 'COMPLETED' || session.creditsTransferred) {
    throw new ApiError(409, 'Completed sessions cannot be deleted', 'SESSION_INVALID_STATUS');
  }

  const deletedSession = session.toObject();
  await session.deleteOne();

  return deletedSession;
};

// Dual confirmation — each participant confirms; settlement runs when both agree.
const confirmSessionCompletion = async (currentUser, sessionId, payload = {}) => {
  const user = ensureAuthenticatedUser(currentUser);
  const mongoSession = await mongoose.startSession();

  try {
    let resultSession;

    await mongoSession.withTransaction(async () => {
      const session = await getSessionDocumentById(sessionId, { session: mongoSession });
      const role = getParticipantRole(session, user.userId);

      if (!role && user.role !== 'ADMIN') {
        throw new ApiError(403, 'Only session participants can confirm completion', 'FORBIDDEN');
      }

      if (session.status === 'COMPLETED' || session.creditsTransferred) {
        throw new ApiError(409, 'Session has already been completed', 'SESSION_ALREADY_COMPLETED');
      }

      if (session.status !== 'ACCEPTED') {
        throw new ApiError(409, 'Only accepted sessions can be confirmed', 'SESSION_INVALID_STATUS');
      }

      const { actualDuration } = resolveBillableHours(session.duration, payload.actualDuration);

      if (role === 'TEACHER' || (user.role === 'ADMIN' && session.teacherId === user.userId)) {
        if (session.teacherConfirmed) {
          throw new ApiError(409, 'Teacher already confirmed this session', 'CONFIRMATION_EXISTS');
        }

        session.teacherConfirmed = true;
        session.teacherConfirmedAt = new Date();
        session.actualDuration = actualDuration;
      } else if (role === 'LEARNER' || user.role === 'ADMIN') {
        if (session.learnerConfirmed) {
          throw new ApiError(409, 'Learner already confirmed this session', 'CONFIRMATION_EXISTS');
        }

        session.learnerConfirmed = true;
        session.learnerConfirmedAt = new Date();
      }

      if (session.teacherConfirmed && session.learnerConfirmed) {
        await finalizeSessionSettlement(session, mongoSession);
      }

      await session.save({ session: mongoSession });
      resultSession = session.toObject();
    });

    return resultSession;
  } finally {
    await mongoSession.endSession();
  }
};

// Backward-compatible: teacher complete = teacher confirmation (learner must still confirm).
const completeSession = async (currentUser, sessionId, payload = {}) => {
  return confirmSessionCompletion(currentUser, sessionId, payload);
};

module.exports = {
  requestSession,
  listSessionsForUser,
  listSessionsDirectory,
  acceptSession,
  rejectSession,
  cancelSession,
  deleteSession,
  confirmSessionCompletion,
  completeSession,
};
