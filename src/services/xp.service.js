const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  XP_LEVELS,
  MAX_LEVEL,
  XP_PER_CREDIT_EARNED,
  XP_SOURCES,
  XP_HISTORY_LIMIT,
} = require('../constants/xp');

const ALLOWED_SOURCES = new Set(Object.values(XP_SOURCES));

const normalizeUserId = (userId) => {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  return normalizedUserId;
};

const parseXpAmount = (amount) => {
  const parsed = Number(amount);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, 'XP amount must be greater than 0', 'VALIDATION_ERROR');
  }

  return Math.round(parsed);
};

// Derives level number from total XP using configured thresholds.
const calculateLevel = (xpTotal = 0) => {
  const xp = Math.max(0, Number(xpTotal) || 0);
  let currentLevel = XP_LEVELS[0];

  for (const tier of XP_LEVELS) {
    if (xp >= tier.minXp) {
      currentLevel = tier;
    }
  }

  return currentLevel.level;
};

const getLevelTitle = (level) => {
  const tier = XP_LEVELS.find((entry) => entry.level === level);
  return tier?.title ?? XP_LEVELS[0].title;
};

const getLevelMinXp = (level) => {
  const tier = XP_LEVELS.find((entry) => entry.level === level);
  return tier?.minXp ?? 0;
};

// XP required to reach the next level; null when already at max level.
const getNextLevelXP = (level) => {
  if (level >= MAX_LEVEL) {
    return null;
  }

  const nextTier = XP_LEVELS.find((entry) => entry.level === level + 1);
  return nextTier?.minXp ?? null;
};

const buildProgressPercent = (xpTotal, level) => {
  const nextLevelXp = getNextLevelXP(level);

  if (nextLevelXp === null) {
    return 100;
  }

  const currentLevelMinXp = getLevelMinXp(level);
  const span = nextLevelXp - currentLevelMinXp;

  if (span <= 0) {
    return 100;
  }

  const progress = ((xpTotal - currentLevelMinXp) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(progress * 100) / 100));
};

const syncLevelFields = (xpTotal) => {
  const level = calculateLevel(xpTotal);

  return {
    level,
    levelTitle: getLevelTitle(level),
  };
};

const formatXpProfile = (user, { includeHistory = false, historyLimit = 10 } = {}) => {
  const xpTotal = Math.max(0, Number(user.xpTotal) || 0);
  const level = user.level ?? calculateLevel(xpTotal);
  const levelTitle = user.levelTitle ?? getLevelTitle(level);
  const currentLevelMinXP = getLevelMinXp(level);
  const nextLevelXP = getNextLevelXP(level);
  const progressPercent = buildProgressPercent(xpTotal, level);

  const payload = {
    userId: user.userId,
    xpTotal,
    level,
    levelTitle,
    currentLevelMinXP,
    nextLevelXP,
    progressPercent,
    isMaxLevel: nextLevelXP === null,
  };

  if (includeHistory) {
    const history = Array.isArray(user.xpHistory) ? user.xpHistory : [];
    payload.recentHistory = [...history]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, historyLimit)
      .map((entry) => ({
        amount: entry.amount,
        source: entry.source,
        sessionId: entry.sessionId || null,
        description: entry.description || '',
        createdAt: entry.createdAt,
      }));
  }

  return payload;
};

// Core XP grant — only callable from trusted server flows (never exposed as a user API).
const addXP = async (userId, amount, source, metadata = {}, mongoSession = null) => {
  const normalizedUserId = normalizeUserId(userId);
  const parsedAmount = parseXpAmount(amount);
  const normalizedSource = String(source || '').trim();

  if (!ALLOWED_SOURCES.has(normalizedSource)) {
    throw new ApiError(400, 'Invalid XP source', 'VALIDATION_ERROR');
  }

  const sessionId = metadata.sessionId?.trim() || null;
  const description = metadata.description?.trim() || '';
  const queryOptions = mongoSession ? { session: mongoSession } : {};

  if (normalizedSource === XP_SOURCES.SESSION_COMPLETED) {
    if (!sessionId) {
      throw new ApiError(400, 'sessionId is required for session XP', 'VALIDATION_ERROR');
    }

    const existingGrant = await User.findOne(
      {
        userId: normalizedUserId,
        'xpHistory.sessionId': sessionId,
        'xpHistory.source': XP_SOURCES.SESSION_COMPLETED,
      },
      null,
      queryOptions
    );

    if (existingGrant) {
      throw new ApiError(409, 'XP for this session was already awarded', 'XP_ALREADY_AWARDED');
    }
  }

  const historyEntry = {
    amount: parsedAmount,
    source: normalizedSource,
    sessionId,
    description,
    createdAt: new Date(),
  };

  const user = await User.findOne({ userId: normalizedUserId }, null, queryOptions);

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const nextXpTotal = Math.max(0, Number(user.xpTotal) || 0) + parsedAmount;
  const { level, levelTitle } = syncLevelFields(nextXpTotal);

  user.xpTotal = nextXpTotal;
  user.level = level;
  user.levelTitle = levelTitle;
  user.lastXpGainAt = historyEntry.createdAt;
  user.xpHistory = [...(user.xpHistory || []), historyEntry].slice(-XP_HISTORY_LIMIT);

  await user.save(queryOptions);

  return {
    ...formatXpProfile(user.toObject ? user.toObject() : user),
    granted: parsedAmount,
    source: normalizedSource,
    sessionId,
  };
};

// MVP conversion: credits earned by the teacher × 10 XP, once per completed session.
const awardSessionCompletionXP = async ({
  teacherId,
  creditsEarned,
  sessionId,
  skill = '',
  mongoSession = null,
}) => {
  const normalizedSessionId = sessionId?.trim();

  if (!normalizedSessionId) {
    throw new ApiError(400, 'sessionId is required', 'VALIDATION_ERROR');
  }

  const credits = Number(creditsEarned);

  if (!Number.isFinite(credits) || credits <= 0) {
    return null;
  }

  const xpAmount = Math.round(credits * XP_PER_CREDIT_EARNED);

  if (xpAmount <= 0) {
    return null;
  }

  const skillLabel = skill?.trim() || 'skill session';
  const description = `Earned from ${skillLabel} tutoring session`;

  return addXP(
    teacherId,
    xpAmount,
    XP_SOURCES.SESSION_COMPLETED,
    {
      sessionId: normalizedSessionId,
      description,
    },
    mongoSession
  );
};

const getXpProfileForUser = async (userId, options = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  const user = await User.findOne({ userId: normalizedUserId }).lean();

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (user.accountStatus && user.accountStatus !== 'ACTIVE') {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return formatXpProfile(user, options);
};

const getMyXpProfile = async (userId) => {
  return getXpProfileForUser(userId, { includeHistory: true, historyLimit: 20 });
};

const getPublicXpProfile = async (userId) => {
  return getXpProfileForUser(userId, { includeHistory: false });
};

module.exports = {
  calculateLevel,
  getLevelTitle,
  getLevelMinXp,
  getNextLevelXP,
  buildProgressPercent,
  formatXpProfile,
  addXP,
  awardSessionCompletionXP,
  getMyXpProfile,
  getPublicXpProfile,
  XP_PER_CREDIT_EARNED,
};
