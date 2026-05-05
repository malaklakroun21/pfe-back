const ApiError = require('../utils/ApiError');
const {
  buildAdminAccessContext,
  hasAllPermissions,
} = require('../services/admin-access.service');

const requireAdminPermissions = (...permissions) => {
  return async (req, res, next) => {
    try {
      const adminAccess = await buildAdminAccessContext(req.user);

      if (!hasAllPermissions(adminAccess.permissions, permissions)) {
        throw new ApiError(
          403,
          `Forbidden: missing admin permissions (${permissions.join(', ')})`,
          'FORBIDDEN'
        );
      }

      req.adminProfile = adminAccess.adminProfile;
      req.adminPermissions = adminAccess.permissions;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = requireAdminPermissions;
