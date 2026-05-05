const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const {
  ADMIN_PERMISSION_KEYS,
  ADMIN_ROLE_VALUES,
  DEFAULT_ADMIN_PERMISSIONS,
} = require('../constants/admin');

const ADMIN_ROLE_SET = new Set(ADMIN_ROLE_VALUES.map((role) => role.toLowerCase()));
const ADMIN_PERMISSION_SET = new Set(ADMIN_PERMISSION_KEYS);

const normalizeRole = (role) => {
  return String(role || '').trim().toLowerCase();
};

const isAdminRole = (role) => {
  return ADMIN_ROLE_SET.has(normalizeRole(role));
};

const normalizePermission = (permission) => {
  return String(permission || '').trim().toLowerCase();
};

const normalizePermissionList = (permissions, { fallbackToDefault = false } = {}) => {
  if (permissions === undefined) {
    return fallbackToDefault ? [...DEFAULT_ADMIN_PERMISSIONS] : [];
  }

  if (!Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an array', 'VALIDATION_ERROR');
  }

  const uniquePermissions = [];
  const seenPermissions = new Set();

  for (const permission of permissions) {
    const normalizedPermission = normalizePermission(permission);

    if (!ADMIN_PERMISSION_SET.has(normalizedPermission)) {
      throw new ApiError(400, 'Invalid admin permission value', 'VALIDATION_ERROR');
    }

    if (!seenPermissions.has(normalizedPermission)) {
      seenPermissions.add(normalizedPermission);
      uniquePermissions.push(normalizedPermission);
    }
  }

  return uniquePermissions;
};

const ensureAdminProfileForUser = async (user, options = {}) => {
  if (!user?.userId) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  if (!isAdminRole(user.role)) {
    throw new ApiError(403, 'Forbidden: insufficient role', 'FORBIDDEN');
  }

  const nextPermissions = normalizePermissionList(options.permissions, {
    fallbackToDefault: true,
  });
  const now = new Date();
  let adminProfile = await Admin.findOne({ userId: user.userId });

  if (!adminProfile) {
    adminProfile = await Admin.create({
      userId: user.userId,
      assignedSkillCategoryId: '',
      skillName: '',
      permissions: nextPermissions,
      assignedDate: now,
      lastActiveDate: now,
    });

    return adminProfile;
  }

  let shouldSave = false;

  if (options.permissions !== undefined) {
    adminProfile.permissions = nextPermissions;
    shouldSave = true;
  }

  if (!Array.isArray(adminProfile.permissions) || !adminProfile.permissions.length) {
    adminProfile.permissions = nextPermissions;
    shouldSave = true;
  }

  if (options.touchLastActive !== false) {
    adminProfile.lastActiveDate = now;
    shouldSave = true;
  }

  if (shouldSave) {
    await adminProfile.save();
  }

  return adminProfile;
};

const buildAdminAccessContext = async (user) => {
  const adminProfile = await ensureAdminProfileForUser(user);
  const permissions = normalizePermissionList(adminProfile.permissions, {
    fallbackToDefault: true,
  });

  return {
    adminProfile,
    permissions,
  };
};

const hasAllPermissions = (ownedPermissions = [], requiredPermissions = []) => {
  const ownedPermissionSet = new Set(normalizePermissionList(ownedPermissions));

  return requiredPermissions.every((permission) => {
    return ownedPermissionSet.has(normalizePermission(permission));
  });
};

module.exports = {
  isAdminRole,
  normalizePermissionList,
  ensureAdminProfileForUser,
  buildAdminAccessContext,
  hasAllPermissions,
};