const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sanitizeUser } = require('./user.service');

const buildAuthPayload = (user) => {
  const token = user.generateAuthToken();

  return {
    user: sanitizeUser(user),
    token,
    accessToken: token,
  };
};

const registerUser = async (userData) => {
  const email = userData.email?.trim().toLowerCase();

  if (!email) {
    throw new ApiError(400, 'Email is required', 'VALIDATION_ERROR');
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
  }

  const requestedRole = userData.role?.toLowerCase?.().trim();
  const role = ['user', 'mentor'].includes(requestedRole) ? requestedRole : 'user';

  try {
    const user = await User.create({
      name: userData.name?.trim(),
      email,
      password: userData.password,
      role,
      bio: userData.bio,
      avatar: userData.avatar,
    });

    return buildAuthPayload(user);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
    }

    throw error;
  }
};

const loginUser = async (email, password) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, 'Email is required', 'VALIDATION_ERROR');
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Account is not active', 'ACCOUNT_NOT_ACTIVE');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  user.lastLogin = new Date();
  await user.save();

  return buildAuthPayload(user);
};

const getCurrentUser = (user) => {
  if (!user) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return sanitizeUser(user);
};

const logoutUser = () => {
  return { success: true };
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  register: registerUser,
  login: loginUser,
  getMe: getCurrentUser,
  logout: logoutUser,
};
