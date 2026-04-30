const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const USER_ROLES = ['LEARNER', 'MENTOR', 'ADMIN'];

const splitDisplayName = (name) => {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = normalizedName.split(' ');

  return {
    firstName,
    lastName: rest.join(' '),
  };
};

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : { ...user };
  delete plainUser.passwordHash;
  return plainUser;
};

const sanitizePublicUser = (user) => {
  const plainUser = sanitizeUser(user);

  return {
    userId: plainUser.userId,
    firstName: plainUser.firstName,
    lastName: plainUser.lastName,
    profilePicture: plainUser.profilePicture,
    bio: plainUser.bio,
    countryId: plainUser.countryId,
    cityId: plainUser.cityId,
    languages: plainUser.languages || [],
    role: plainUser.role,
    createdAt: plainUser.createdAt,
  };
};

const ensureAuthenticatedUser = (user) => {
  if (!user) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return user;
};

const parsePositiveInteger = (value, fallback, fieldName, maxValue = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `${fieldName} must be a positive integer`, 'VALIDATION_ERROR');
  }

  return Math.min(parsed, maxValue);
};

const getCurrentUser = (user) => {
  return sanitizeUser(ensureAuthenticatedUser(user));
};

const updateCurrentUser = async (user, payload) => {
  const currentUser = ensureAuthenticatedUser(user);

  if (payload.name !== undefined) {
    const { firstName, lastName } = splitDisplayName(payload.name);
    currentUser.firstName = firstName;
    currentUser.lastName = lastName;
  }

  if (payload.firstName !== undefined) {
    currentUser.firstName = payload.firstName;
  }

  if (payload.lastName !== undefined) {
    currentUser.lastName = payload.lastName;
  }

  if (payload.bio !== undefined) {
    currentUser.bio = payload.bio;
  }

  if (payload.photo !== undefined) {
    currentUser.profilePicture = payload.photo;
  }

  if (payload.profilePicture !== undefined) {
    currentUser.profilePicture = payload.profilePicture;
  }

  await currentUser.save();

  return sanitizeUser(currentUser);
};

const getUserPublicProfile = async (userId) => {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  const user = await User.findOne({
    userId: normalizedUserId,
    accountStatus: 'ACTIVE',
  });

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return sanitizePublicUser(user);
};

const listUsers = async (query = {}) => {
  const q = query.q?.trim();
  const role = query.role?.trim().toUpperCase();
  const page = parsePositiveInteger(query.page, 1, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 'limit', 100);

  const filter = {
    accountStatus: 'ACTIVE',
  };

  if (role) {
    if (!USER_ROLES.includes(role)) {
      throw new ApiError(400, 'Invalid role filter', 'VALIDATION_ERROR');
    }

    filter.role = role;
  }

  if (q) {
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');

    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { userId: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map(sanitizePublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

module.exports = {
  sanitizeUser,
  sanitizePublicUser,
  getCurrentUser,
  updateCurrentUser,
  getUserPublicProfile,
  listUsers,
};
