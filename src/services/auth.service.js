const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken } = require('../utils/jwt');
const { generateResetToken, hashToken } = require('../utils/token');
const { sanitizeUser } = require('./user.service');
const sendEmail = require('../utils/email');

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

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  // Return a generic message regardless of whether the email exists.
  // Revealing whether an email is registered is an enumeration vulnerability.
  if (!user) {
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  const { plainToken, hashedToken, expires } = generateResetToken();

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${plainToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. This link expires in 10 minutes:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
  } catch (emailError) {
    console.error('[EMAIL ERROR]', emailError.message);
    // Roll back the token so the user can retry — a dangling token with no
    // delivered email would lock them out until it expires.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Failed to send reset email. Please try again.', 'EMAIL_SEND_FAILED');
  }

  return { message: 'If that email exists, a reset link has been sent.' };
};

const resetPassword = async (plainToken, newPassword) => {
  const hashedToken = hashToken(plainToken);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired token', 'INVALID_RESET_TOKEN');
  }

  // Hash manually — the model has no pre-save hook; this mirrors how register() works.
  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return buildAuthPayload(user);
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
