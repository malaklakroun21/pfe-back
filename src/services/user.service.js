const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const USER_ROLES = ['LEARNER', 'MENTOR', 'ADMIN'];

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const splitDisplayName = (name) => {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = normalizedName.split(' ');

  return {
    firstName,
    lastName: rest.join(' '),
  };
};

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : { ...user };
  delete plainUser.passwordHash;
  return plainUser;
};

const sanitizePublicUser = (user) => {
  const plainUser = sanitizeUser(user);

  return {
    userId: plainUser.userId,
    firstName: plainUser.firstName,
    lastName: plainUser.lastName,
    profilePicture: plainUser.profilePicture,
    bio: plainUser.bio,
    countryId: plainUser.countryId,
    cityId: plainUser.cityId,
    languages: plainUser.languages || [],
    offeredSkills: plainUser.offeredSkills || [],
    wantedSkills: plainUser.wantedSkills || [],
    role: plainUser.role,
    createdAt: plainUser.createdAt,
  };
};

const ensureAuthenticatedUser = (user) => {
  if (!user) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return user;
};

const normalizeUserId = (userId) => {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  return normalizedUserId;
};

const parsePositiveInteger = (value, fallback, fieldName, maxValue = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `${fieldName} must be a positive integer`, 'VALIDATION_ERROR');
  }

  return Math.min(parsed, maxValue);
};

const extractSkillName = (payload = {}) => {
  const rawSkillName = payload.skillName ?? payload.skill;
  const normalizedSkillName = rawSkillName?.trim();

  if (!normalizedSkillName) {
    throw new ApiError(400, 'Skill name is required', 'VALIDATION_ERROR');
  }

  return normalizedSkillName;
};

const hasSkill = (skills = [], targetSkillName) => {
  const normalizedTarget = targetSkillName.toLowerCase();

  return skills.some((skill) => skill.toLowerCase() === normalizedTarget);
};

const getCurrentUser = (user) => {
  return sanitizeUser(ensureAuthenticatedUser(user));
};

const getCurrentUserSkillList = (user, fieldName) => {
  const currentUser = ensureAuthenticatedUser(user);

  return [...(currentUser[fieldName] || [])];
};

const getCurrentUserOfferedSkills = (user) => {
  return {
    offeredSkills: getCurrentUserSkillList(user, 'offeredSkills'),
  };
};

const getCurrentUserWantedSkills = (user) => {
  return {
    wantedSkills: getCurrentUserSkillList(user, 'wantedSkills'),
  };
};

const applyProfileUpdates = (currentUser, payload = {}) => {
  if (payload.name !== undefined) {
    const { firstName, lastName } = splitDisplayName(payload.name);
    currentUser.firstName = firstName;
    currentUser.lastName = lastName;
  }

  if (payload.firstName !== undefined) {
    currentUser.firstName = payload.firstName;
  }

  if (payload.lastName !== undefined) {
    currentUser.lastName = payload.lastName;
  }

  if (payload.bio !== undefined) {
    currentUser.bio = payload.bio;
  }

  if (payload.avatar !== undefined) {
    currentUser.profilePicture = payload.avatar;
  }

  if (payload.photo !== undefined) {
    currentUser.profilePicture = payload.photo;
  }

  if (payload.profilePicture !== undefined) {
    currentUser.profilePicture = payload.profilePicture;
  }
};

const updateCurrentUser = async (user, payload) => {
  const currentUser = ensureAuthenticatedUser(user);
  applyProfileUpdates(currentUser, payload);

  await currentUser.save();

  return sanitizeUser(currentUser);
};

const getUserDocumentById = async (userId, options = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  const filter = {
    userId: normalizedUserId,
  };

  if (options.activeOnly) {
    filter.accountStatus = 'ACTIVE';
  }

  const user = await User.findOne(filter);

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return user;
};

const getUserPublicProfile = async (userId) => {
  const user = await getUserDocumentById(userId, { activeOnly: true });

  return sanitizePublicUser(user);
};

const getUserById = async (id) => {
  return getUserPublicProfile(id);
};

const updateUserProfile = async (userId, updates = {}) => {
  const currentUser = await getUserDocumentById(userId, { activeOnly: true });
  applyProfileUpdates(currentUser, updates);
  await currentUser.save();

  return sanitizeUser(currentUser);
};

const listUsers = async (query = {}) => {
  const q = query.q?.trim();
  const role = query.role?.trim().toUpperCase();
  const offeredSkill = query.offeredSkill?.trim();
  const wantedSkill = query.wantedSkill?.trim();
  const skill = query.skill?.trim();
  const page = parsePositiveInteger(query.page, 1, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 'limit', 100);

  const filters = [
    {
      accountStatus: 'ACTIVE',
    },
  ];

  if (role) {
    if (!USER_ROLES.includes(role)) {
      throw new ApiError(400, 'Invalid role filter', 'VALIDATION_ERROR');
    }

    filters.push({ role });
  }

  if (q) {
    const escapedQuery = escapeRegExp(q);
    const searchRegex = new RegExp(escapedQuery, 'i');

    filters.push({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { userId: searchRegex },
        { offeredSkills: searchRegex },
        { wantedSkills: searchRegex },
      ],
    });
  }

  if (offeredSkill) {
    filters.push({
      offeredSkills: new RegExp(`^${escapeRegExp(offeredSkill)}$`, 'i'),
    });
  }

  if (wantedSkill) {
    filters.push({
      wantedSkills: new RegExp(`^${escapeRegExp(wantedSkill)}$`, 'i'),
    });
  }

  if (skill) {
    const exactSkillRegex = new RegExp(`^${escapeRegExp(skill)}$`, 'i');

    filters.push({
      $or: [
        { offeredSkills: exactSkillRegex },
        { wantedSkills: exactSkillRegex },
      ],
    });
  }

  const filter = filters.length === 1 ? filters[0] : { $and: filters };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map(sanitizePublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const searchUsers = async ({ skill, role, page, limit, q, offeredSkill, wantedSkill } = {}) => {
  return listUsers({
    skill,
    role,
    page,
    limit,
    q,
    offeredSkill,
    wantedSkill,
  });
};

const addSkillToCurrentUser = async (user, fieldName, payload) => {
  const currentUser = ensureAuthenticatedUser(user);
  const skillName = extractSkillName(payload);
  const currentSkills = currentUser[fieldName] || [];

  if (hasSkill(currentSkills, skillName)) {
    throw new ApiError(409, 'Skill already exists', 'SKILL_ALREADY_EXISTS');
  }

  currentUser[fieldName] = [...currentSkills, skillName];
  await currentUser.save();

  return sanitizeUser(currentUser);
};

const removeSkillFromCurrentUser = async (user, fieldName, payload) => {
  const currentUser = ensureAuthenticatedUser(user);
  const skillName = extractSkillName(payload);
  const currentSkills = currentUser[fieldName] || [];
  const skillIndex = currentSkills.findIndex((skill) => {
    return skill.toLowerCase() === skillName.toLowerCase();
  });

  if (skillIndex === -1) {
    throw new ApiError(404, 'Skill not found on profile', 'SKILL_NOT_FOUND');
  }

  currentSkills.splice(skillIndex, 1);
  currentUser[fieldName] = currentSkills;
  await currentUser.save();

  return sanitizeUser(currentUser);
};

const addOfferedSkillToCurrentUser = async (user, payload) => {
  return addSkillToCurrentUser(user, 'offeredSkills', payload);
};

const removeOfferedSkillFromCurrentUser = async (user, payload) => {
  return removeSkillFromCurrentUser(user, 'offeredSkills', payload);
};

const addWantedSkillToCurrentUser = async (user, payload) => {
  return addSkillToCurrentUser(user, 'wantedSkills', payload);
};

const removeWantedSkillFromCurrentUser = async (user, payload) => {
  return removeSkillFromCurrentUser(user, 'wantedSkills', payload);
};

const addSkillOffered = async (userId, payload) => {
  const user = await getUserDocumentById(userId, { activeOnly: true });
  return addOfferedSkillToCurrentUser(user, payload);
};

const removeSkillOffered = async (userId, payload) => {
  const user = await getUserDocumentById(userId, { activeOnly: true });
  return removeOfferedSkillFromCurrentUser(user, payload);
};

const addSkillWanted = async (userId, payload) => {
  const user = await getUserDocumentById(userId, { activeOnly: true });
  return addWantedSkillToCurrentUser(user, payload);
};

const removeSkillWanted = async (userId, payload) => {
  const user = await getUserDocumentById(userId, { activeOnly: true });
  return removeWantedSkillFromCurrentUser(user, payload);
};

module.exports = {
  sanitizeUser,
  sanitizePublicUser,
  getCurrentUser,
  getCurrentUserOfferedSkills,
  getCurrentUserWantedSkills,
  updateCurrentUser,
  getUserPublicProfile,
  getUserById,
  updateUserProfile,
  listUsers,
  searchUsers,
  addOfferedSkillToCurrentUser,
  removeOfferedSkillFromCurrentUser,
  addWantedSkillToCurrentUser,
  removeWantedSkillFromCurrentUser,
  addSkillOffered,
  removeSkillOffered,
  addSkillWanted,
  removeSkillWanted,
};
