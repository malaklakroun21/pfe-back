const ApiError = require('../utils/ApiError');

const normalizeRole = (role) => {
  const value = String(role || '').trim();
  return value.toLowerCase();
};

const authorizeRoles = (...roles) => {
  const allowedRoles = new Set(roles.map((role) => normalizeRole(role)));

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
    }

    const userRole = normalizeRole(req.user.role);

    if (!allowedRoles.has(userRole)) {
      return next(new ApiError(403, 'Forbidden: insufficient role', 'FORBIDDEN'));
    }

    return next();
  };
};

module.exports = authorizeRoles;
