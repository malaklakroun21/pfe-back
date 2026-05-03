const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const CreditBalance = require('../models/CreditBalance');
const CreditTransaction = require('../models/CreditTransaction');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken } = require('../utils/jwt');
const { sanitizeUser } = require('./user.service');

const WELCOME_CREDITS = 10;
const SYSTEM_ACTOR = 'SYSTEM';

const createWelcomeCredits = async (userId) => {
  await Promise.all([
    CreditBalance.create({
      balanceId: `BAL-${randomUUID()}`,
      userId,
      currentBalance: WELCOME_CREDITS,
      totalEarned: WELCOME_CREDITS,
      totalSpent: 0,
      updatedBy: SYSTEM_ACTOR,
    }),
    CreditTransaction.create({
      transactionId: `TRX-${randomUUID()}`,
      userId,
      transactionType: 'INITIAL_ALLOCATION',
      amount: WELCOME_CREDITS,
      description: 'Welcome credits',
      balanceBefore: 0,
      balanceAfter: WELCOME_CREDITS,
      initiatedBy: SYSTEM_ACTOR,
    }),
  ]);
};

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
    timeCredits: mongoose.Types.Decimal128.fromString(String(WELCOME_CREDITS)),
  });

  await createWelcomeCredits(user.userId);

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
  login,
};
