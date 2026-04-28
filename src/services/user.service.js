const ApiError = require('../utils/ApiError');

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : { ...user };
  delete plainUser.passwordHash;
  return plainUser;
};

const getCurrentUser = (user) => {
  if (!user) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return sanitizeUser(user);
};

module.exports = {
  sanitizeUser,
  getCurrentUser,
};
