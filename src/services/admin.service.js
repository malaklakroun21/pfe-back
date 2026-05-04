const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sanitizeUser } = require('./user.service');

const ADMIN_ASSIGNABLE_ROLES = new Set(['user', 'admin', 'LEARNER', 'MENTOR', 'ADMIN']);

const normalizeUserId = (id) => {
  const userId = id?.trim();

  if (!userId) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  return userId;
};

const parsePositiveInteger = (value, fallback, fieldName, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `${fieldName} must be a positive integer`, 'VALIDATION_ERROR');
  }

  return Math.min(parsed, max);
};

const getUserDocumentById = async (id) => {
  const userId = normalizeUserId(id);
  const user = await User.findOne({ userId });

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return user;
};

const splitDisplayName = (name) => {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = normalizedName.split(' ');

  return {
    firstName,
    lastName: rest.join(' '),
  };
};

const normalizeRole = (role) => {
  const normalizedRole = String(role || '').trim();

  if (!normalizedRole || !ADMIN_ASSIGNABLE_ROLES.has(normalizedRole)) {
    throw new ApiError(400, 'Invalid role value', 'VALIDATION_ERROR');
  }

  return normalizedRole;
};

const listUsers = async (query = {}) => {
  const page = parsePositiveInteger(query.page, 1, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 'limit', 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments({}),
  ]);

  return {
    items: items.map((user) => sanitizeUser(user)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getSingleUser = async (id) => {
  const user = await getUserDocumentById(id);
  return sanitizeUser(user);
};

const updateUser = async (id, payload = {}) => {
  const user = await getUserDocumentById(id);

  if (payload.name !== undefined) {
    const { firstName, lastName } = splitDisplayName(payload.name);
    user.firstName = firstName;
    user.lastName = lastName;
  }

  if (payload.email !== undefined) {
    user.email = payload.email.trim().toLowerCase();
  }

  if (payload.role !== undefined) {
    user.role = normalizeRole(payload.role);
  }

  await user.save();
  return sanitizeUser(user);
};

const deleteUser = async (targetUserId, currentUserId) => {
  const normalizedTargetUserId = normalizeUserId(targetUserId);
  const normalizedCurrentUserId = normalizeUserId(currentUserId);

  if (normalizedTargetUserId === normalizedCurrentUserId) {
    throw new ApiError(400, 'Admin cannot delete self', 'SELF_DELETE_FORBIDDEN');
  }

  const user = await getUserDocumentById(normalizedTargetUserId);
  await user.deleteOne();

  return sanitizeUser(user);
};

const updateUserRole = async (id, role) => {
  const user = await getUserDocumentById(id);
  user.role = normalizeRole(role);
  await user.save();

  return sanitizeUser(user);
};

module.exports = {
  listUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  updateUserRole,
};
