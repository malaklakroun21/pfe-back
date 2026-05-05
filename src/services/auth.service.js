const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken } = require('../utils/jwt');
const { DEFAULT_ADMIN_PERMISSIONS } = require('../constants/admin');
const { sanitizeUser } = require('./user.service');
const { ensureAdminProfileForUser } = require('./admin-access.service');
const { createAuditLog } = require('./admin-audit.service');

const INITIAL_TIME_CREDITS = '10';

const buildAuthPayload = (user) => {
  return {
    user: sanitizeUser(user),
    accessToken: signAccessToken({
      sub: user.userId,
      role: user.role,
    }),
  };
};

const register = async (payload) => {
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new ApiError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
  }

  const user = await User.create({
    userId: `USR-${randomUUID()}`,
    email: payload.email,
    passwordHash: await hashPassword(payload.password),
    firstName: payload.firstName,
    lastName: payload.lastName,
    profilePicture: payload.profilePicture,
    bio: payload.bio,
    countryId: payload.countryId,
    cityId: payload.cityId,
    languages: payload.languages || [],
    role: payload.role || 'LEARNER',
    timeCredits: mongoose.Types.Decimal128.fromString(INITIAL_TIME_CREDITS),
  });

  return buildAuthPayload(user);
};

const assertAdminBootstrapSecret = (providedSecret) => {
  const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();

  if (!configuredSecret) {
    throw new ApiError(
      403,
      'Admin bootstrap is disabled. Configure ADMIN_BOOTSTRAP_SECRET to enable it.',
      'ADMIN_BOOTSTRAP_DISABLED'
    );
  }

  if (String(providedSecret || '').trim() !== configuredSecret) {
    throw new ApiError(403, 'Invalid admin bootstrap secret', 'INVALID_ADMIN_BOOTSTRAP_SECRET');
  }
};

const registerAdmin = async (payload, options = {}) => {
  assertAdminBootstrapSecret(options.bootstrapSecret);

  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new ApiError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
  }

  const user = await User.create({
    userId: `USR-${randomUUID()}`,
    email: payload.email,
    passwordHash: await hashPassword(payload.password),
    firstName: payload.firstName,
    lastName: payload.lastName,
    profilePicture: payload.profilePicture,
    bio: payload.bio,
    countryId: payload.countryId,
    cityId: payload.cityId,
    languages: payload.languages || [],
    role: 'ADMIN',
    timeCredits: mongoose.Types.Decimal128.fromString(INITIAL_TIME_CREDITS),
  });

  const adminProfile = await ensureAdminProfileForUser(user, {
    permissions: payload.permissions || DEFAULT_ADMIN_PERMISSIONS,
    touchLastActive: false,
  });

  await createAuditLog({
    adminProfile,
    userId: user.userId,
    actionType: 'ADMIN_BOOTSTRAPPED',
    targetEntityId: user.userId,
    targetEntityType: 'User',
    details: {
      permissions: adminProfile.permissions,
      source: 'auth.register-admin',
    },
    ipAddress: options.ipAddress || '',
  });

  return buildAuthPayload(user);
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new ApiError(403, 'Account is not active', 'ACCOUNT_NOT_ACTIVE');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  user.lastLogin = new Date();
  await user.save();

  return buildAuthPayload(user);
};

module.exports = {
  register,
  registerAdmin,
  login,
};
