const mongoose = require('mongoose');

const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const USER_ROLES = ['user', 'mentor', 'admin'];

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  delete plainUser.password;
  delete plainUser.passwordHash;
  return plainUser;
};

const sanitizePublicUser = (user) => {
  const plainUser = sanitizeUser(user);
  const id = plainUser._id?.toString?.() ?? String(plainUser._id);

  return {
    id,
    userId: id,
    name: plainUser.name,
    avatar: plainUser.avatar,
    bio: plainUser.bio,
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
    currentUser.name = payload.name.trim().replace(/\s+/g, ' ');
  }

  if (payload.bio !== undefined) {
    currentUser.bio = payload.bio;
  }

  if (payload.photo !== undefined) {
    currentUser.avatar = payload.photo;
  }

  if (payload.profilePicture !== undefined) {
    currentUser.avatar = payload.profilePicture;
  }

  await currentUser.save();

  return sanitizeUser(currentUser);
};

const getUserPublicProfile = async (userId) => {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId || !mongoose.Types.ObjectId.isValid(normalizedUserId)) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  const user = await User.findOne({
    _id: new mongoose.Types.ObjectId(normalizedUserId),
    isActive: true,
  });

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return sanitizePublicUser(user);
};

const listUsers = async (query = {}) => {
  const q = query.q?.trim();
  const role = query.role?.trim().toLowerCase();
  const page = parsePositiveInteger(query.page, 1, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 'limit', 100);

  const filter = {
    isActive: true,
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

    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
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
