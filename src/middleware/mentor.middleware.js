const ApiError = require('../utils/ApiError');
const { MENTOR_ROLES } = require('../constants/mechanics');

const requireMentorOrAdmin = (req, res, next) => {
  if (!req.user?.userId) {
    return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
  }

  const role = String(req.user.role || '').toUpperCase();

  if (!MENTOR_ROLES.has(role)) {
    return next(new ApiError(403, 'Mentor or admin access required', 'FORBIDDEN'));
  }

  return next();
};

module.exports = requireMentorOrAdmin;
