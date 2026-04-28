const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return process.env.JWT_SECRET;
};

const signAccessToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED');
    }

    throw new ApiError(401, 'Invalid access token', 'INVALID_TOKEN');
  }
};

module.exports = {
  signAccessToken,
  signToken: signAccessToken,
  verifyAccessToken,
};
