const mongoose = require('mongoose');

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const payload = verifyAccessToken(token);

    if (!payload.sub) {
      throw new ApiError(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    if (!mongoose.Types.ObjectId.isValid(payload.sub)) {
      throw new ApiError(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      throw new ApiError(401, 'User for this token no longer exists', 'AUTH_USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is not active', 'ACCOUNT_NOT_ACTIVE');
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = protect;
