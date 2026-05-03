const { randomUUID } = require('crypto');

const CreditBalance = require('../models/CreditBalance');
const Learner = require('../models/Learner');
const Session = require('../models/Session');
const SessionRequest = require('../models/SessionRequest');
const Skill = require('../models/Skill');
const SkillCategory = require('../models/SkillCategory');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const ALLOWED_REQUEST_STATUSES = ['PENDING', 'ACCEPTED'];
const CANCELLABLE_SESSION_STATUSES = ['PENDING', 'SCHEDULED', 'IN_PROGRESS'];
const PROVIDER_RESPONSE_ALLOWED_STATUSES = ['PENDING'];
const DEFAULT_DIRECT_SESSION_CREDITS = 1;
const DEFAULT_SKILL_CATEGORY_NAME = 'General';
const DEFAULT_SKILL_CATEGORY_ID = 'CATEGORY-GENERAL-AUTO';
const SKILL_PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const ensureAuthenticatedUser = (user) => {
  if (!user?.userId) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return user;
};

const normalizeRequestId = (requestId) => {
  const normalizedRequestId = requestId?.trim();

  if (!normalizedRequestId) {
    throw new ApiError(400, 'Request id is required', 'VALIDATION_ERROR');
  }

  return normalizedRequestId;
};

const normalizeSessionId = (sessionId) => {
  const normalizedSessionId = sessionId?.trim();

  if (!normalizedSessionId) {
    throw new ApiError(400, 'Session id is required', 'VALIDATION_ERROR');
  }

  return normalizedSessionId;
};

const ensureLearnerProfile = (learner, action) => {
  if (!learner) {
    throw new ApiError(403, `Learner profile is required to ${action} a session`, 'LEARNER_REQUIRED');
  }

  return learner;
};

const normalizeUserId = (userId, fieldName = 'User id') => {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new ApiError(400, `${fieldName} is required`, 'VALIDATION_ERROR');
  }

  return normalizedUserId;
};

const normalizeSkillName = (skillName) => {
  const normalizedSkillName = skillName?.trim();

  if (!normalizedSkillName) {
    throw new ApiError(400, 'Skill name is required', 'VALIDATION_ERROR');
  }

  return normalizedSkillName;
};

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const resolveDirectPreferredDuration = (payload = {}) => {
  const rawDuration =
    payload.preferredDuration ?? payload.creditsExchanged ?? DEFAULT_DIRECT_SESSION_CREDITS;
  const preferredDuration = Number(rawDuration);

  if (!Number.isFinite(preferredDuration) || preferredDuration <= 0) {
    throw new ApiError(
      400,
      'preferredDuration must be greater than 0',
      'VALIDATION_ERROR'
    );
  }

  return preferredDuration;
};

const sanitizeSession = (session) => {
  return session?.toObject ? session.toObject() : { ...session };
};

const parseDate = (value, fieldName) => {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date`, 'VALIDATION_ERROR');
  }

  return date;
};

const resolveCreditsExchanged = (payload, sessionRequest) => {
  const rawCreditsExchanged = payload.creditsExchanged ?? sessionRequest.preferredDuration;
  const creditsExchanged = Number(rawCreditsExchanged);

  if (!Number.isFinite(creditsExchanged) || creditsExchanged <= 0) {
    throw new ApiError(
      400,
      'Session credits must be greater than 0',
      'INVALID_SESSION_CREDITS'
    );
  }

  return creditsExchanged;
};

const getAvailableCredits = async (user) => {
  const creditBalance = await CreditBalance.findOne({ userId: user.userId });

  if (creditBalance) {
    return Number(creditBalance.currentBalance || 0);
  }

  if (user.timeCredits === undefined || user.timeCredits === null) {
    return 0;
  }

  return Number(user.timeCredits.toString());
};

const getActiveUserByUserId = async (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const user = await User.findOne({
    userId: normalizedUserId,
    accountStatus: 'ACTIVE',
  });

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return user;
};

const findOrCreateLearnerProfile = async (user) => {
  const existingLearner = await Learner.findOne({ userId: user.userId });

  if (existingLearner) {
    return existingLearner;
  }

  return Learner.create({
    learnerId: `LRN-${randomUUID()}`,
    userId: user.userId,
    learningGoals: '',
    preferredLearningStyle: '',
    profileCompleted: false,
  });
};

const getOrCreateDefaultSkillCategory = async () => {
  const existingCategory = await SkillCategory.findOne({
    categoryId: DEFAULT_SKILL_CATEGORY_ID,
  });

  if (existingCategory) {
    return existingCategory;
  }

  return SkillCategory.create({
    categoryId: DEFAULT_SKILL_CATEGORY_ID,
    categoryName: DEFAULT_SKILL_CATEGORY_NAME,
    description: 'Automatically created category for direct session skills.',
    isActive: true,
  });
};

const resolveDirectSkill = async (payload, providerUser) => {
  if (payload.skillId) {
    const skill = await Skill.findOne({ skillId: payload.skillId.trim() });

    if (!skill) {
      throw new ApiError(404, 'Skill not found', 'SKILL_NOT_FOUND');
    }

    return skill;
  }

  const skillName = normalizeSkillName(payload.skillName);
  const skill = await Skill.findOne({
    userId: providerUser.userId,
    skillName: new RegExp(`^${escapeRegExp(skillName)}$`, 'i'),
  });

  if (skill) {
    return skill;
  }

  const category = await getOrCreateDefaultSkillCategory();
  const proficiencyLevel = payload.proficiencyLevel?.trim().toUpperCase() || 'INTERMEDIATE';

  if (!SKILL_PROFICIENCY_LEVELS.includes(proficiencyLevel)) {
    throw new ApiError(400, 'Invalid proficiencyLevel', 'VALIDATION_ERROR');
  }

  return Skill.create({
    skillId: `SKILL-${randomUUID()}`,
    userId: providerUser.userId,
    categoryId: category.categoryId,
    skillName,
    proficiencyLevel,
    description: payload.description?.trim() || '',
    yearsOfExperience: Number(payload.yearsOfExperience || 0),
    selfDeclared: true,
    validationStatus: 'UNVALIDATED',
  });
};

const createDirectSessionRequest = async (currentUser, payload, startTime) => {
  const requesterLearner = await findOrCreateLearnerProfile(currentUser);
  const providerUserId = payload.providerUserId?.trim() || currentUser.userId;
  const providerUser =
    providerUserId === currentUser.userId
      ? currentUser
      : await getActiveUserByUserId(providerUserId);
  const providerLearner =
    providerUserId === currentUser.userId
      ? requesterLearner
      : await findOrCreateLearnerProfile(providerUser);
  const skill = await resolveDirectSkill(payload, providerUser);
  const preferredDuration = resolveDirectPreferredDuration(payload);

  const sessionRequest = await SessionRequest.create({
    requestId: `REQ-${randomUUID()}`,
    learnerId: requesterLearner.learnerId,
    teacherId: providerLearner.learnerId,
    skillId: skill.skillId,
    requestStatus: 'PENDING',
    preferredDuration,
    scheduledDate: startTime,
  });

  return {
    requesterLearner,
    sessionRequest,
  };
};

const createSession = async (currentUser, payload) => {
  const user = ensureAuthenticatedUser(currentUser);
  const startTime = parseDate(payload.startTime ?? payload.scheduledDate, 'startTime');
  let requesterLearner;
  let sessionRequest;

  if (payload.requestId) {
    const requestId = normalizeRequestId(payload.requestId);
    const existingContext = await Promise.all([
      Learner.findOne({ userId: user.userId }),
      SessionRequest.findOne({ requestId }),
      Session.findOne({ requestId }),
    ]);

    requesterLearner = existingContext[0];
    sessionRequest = existingContext[1];
    const existingSession = existingContext[2];

    ensureLearnerProfile(requesterLearner, 'create');

    if (!sessionRequest) {
      throw new ApiError(404, 'Session request not found', 'SESSION_REQUEST_NOT_FOUND');
    }

    if (existingSession) {
      throw new ApiError(409, 'A session already exists for this request', 'SESSION_ALREADY_EXISTS');
    }

    if (!ALLOWED_REQUEST_STATUSES.includes(sessionRequest.requestStatus)) {
      throw new ApiError(
        409,
        'This session request cannot be scheduled',
        'SESSION_REQUEST_INVALID_STATUS'
      );
    }

    if (sessionRequest.learnerId !== requesterLearner.learnerId) {
      throw new ApiError(
        403,
        'Only the request owner can create a session',
        'FORBIDDEN_SESSION_CREATION'
      );
    }
  } else {
    const directContext = await createDirectSessionRequest(user, payload, startTime);
    requesterLearner = directContext.requesterLearner;
    sessionRequest = directContext.sessionRequest;
  }

  const creditsExchanged = resolveCreditsExchanged(payload, sessionRequest);
  const availableCredits = await getAvailableCredits(user);

  if (availableCredits < creditsExchanged) {
    throw new ApiError(
      400,
      'Requester does not have enough credits',
      'INSUFFICIENT_CREDITS'
    );
  }

  const endTime = parseDate(payload.endTime, 'endTime');
  const resolvedStartTime = startTime ?? sessionRequest.scheduledDate;

  if (resolvedStartTime && endTime && endTime <= resolvedStartTime) {
    throw new ApiError(
      400,
      'endTime must be greater than startTime',
      'INVALID_SESSION_SCHEDULE'
    );
  }

  const session = await Session.create({
    sessionId: `SES-${randomUUID()}`,
    requestId: sessionRequest.requestId,
    learnerId: sessionRequest.learnerId,
    teacherId: sessionRequest.teacherId,
    skillId: sessionRequest.skillId,
    sessionStatus: 'PENDING',
    startTime: resolvedStartTime,
    endTime,
    creditsExchanged,
  });

  return sanitizeSession(session);
};

const cancelSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const normalizedSessionId = normalizeSessionId(sessionId);

  const [requesterLearner, session] = await Promise.all([
    Learner.findOne({ userId: user.userId }),
    Session.findOne({ sessionId: normalizedSessionId }),
  ]);

  ensureLearnerProfile(requesterLearner, 'cancel');

  if (!session) {
    throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }

  const isParticipant =
    session.learnerId === requesterLearner.learnerId ||
    session.teacherId === requesterLearner.learnerId;

  if (!isParticipant) {
    throw new ApiError(403, 'Only session participants can cancel this session', 'FORBIDDEN');
  }

  if (!CANCELLABLE_SESSION_STATUSES.includes(session.sessionStatus)) {
    throw new ApiError(
      409,
      'This session can no longer be cancelled',
      'SESSION_NOT_CANCELLABLE'
    );
  }

  session.sessionStatus = 'CANCELLED';
  await session.save();

  return sanitizeSession(session);
};

const updateRelatedRequestStatus = async (session, requestStatus) => {
  const sessionRequest = await SessionRequest.findOne({ requestId: session.requestId });

  if (!sessionRequest) {
    return;
  }

  sessionRequest.requestStatus = requestStatus;
  sessionRequest.responseDate = new Date();
  await sessionRequest.save();
};

const ensureProviderCanRespondToSession = (session, providerLearnerId) => {
  if (session.teacherId !== providerLearnerId) {
    throw new ApiError(403, 'Only the provider can respond to this session', 'FORBIDDEN');
  }

  if (!PROVIDER_RESPONSE_ALLOWED_STATUSES.includes(session.sessionStatus)) {
    throw new ApiError(
      409,
      'Only pending sessions can be accepted or rejected',
      'SESSION_NOT_PENDING'
    );
  }
};

const acceptSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const normalizedSessionId = normalizeSessionId(sessionId);

  const [providerLearner, session] = await Promise.all([
    Learner.findOne({ userId: user.userId }),
    Session.findOne({ sessionId: normalizedSessionId }),
  ]);

  const learner = ensureLearnerProfile(providerLearner, 'accept');

  if (!session) {
    throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }

  ensureProviderCanRespondToSession(session, learner.learnerId);

  session.sessionStatus = 'SCHEDULED';
  await session.save();
  await updateRelatedRequestStatus(session, 'ACCEPTED');

  return sanitizeSession(session);
};

const rejectSession = async (currentUser, sessionId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const normalizedSessionId = normalizeSessionId(sessionId);

  const [providerLearner, session] = await Promise.all([
    Learner.findOne({ userId: user.userId }),
    Session.findOne({ sessionId: normalizedSessionId }),
  ]);

  const learner = ensureLearnerProfile(providerLearner, 'reject');

  if (!session) {
    throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }

  ensureProviderCanRespondToSession(session, learner.learnerId);

  session.sessionStatus = 'CANCELLED';
  await session.save();
  await updateRelatedRequestStatus(session, 'REJECTED');

  return sanitizeSession(session);
};

module.exports = {
  createSession,
  cancelSession,
  acceptSession,
  rejectSession,
};
