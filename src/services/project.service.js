const { randomUUID } = require('crypto');

const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

const PROJECT_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const ensureAuthenticatedUser = (user) => {
  if (!user?.userId) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return user;
};

const normalizeProjectId = (projectId) => {
  const normalizedProjectId = projectId?.trim();

  if (!normalizedProjectId) {
    throw new ApiError(400, 'Project id is required', 'VALIDATION_ERROR');
  }

  return normalizedProjectId;
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

const sanitizeProject = (project) => {
  return project?.toObject ? project.toObject() : { ...project };
};

const getProjectDocumentById = async (projectId) => {
  const normalizedProjectId = normalizeProjectId(projectId);
  const project = await Project.findOne({ projectId: normalizedProjectId });

  if (!project) {
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  return project;
};

const ensureProjectOwner = (project, userId) => {
  if (project.ownerId !== userId) {
    throw new ApiError(403, 'You are not allowed to modify this project', 'FORBIDDEN');
  }
};

const createProject = async (currentUser, payload) => {
  const user = ensureAuthenticatedUser(currentUser);
  const project = await Project.create({
    projectId: `PRJ-${randomUUID()}`,
    ownerId: user.userId,
    title: payload.title,
    description: payload.description || '',
    requiredSkill: payload.requiredSkill || '',
    status: payload.status || 'OPEN',
  });

  return sanitizeProject(project);
};

const listProjects = async (query = {}) => {
  const q = query.q?.trim();
  const ownerId = query.ownerId?.trim();
  const status = query.status?.trim().toUpperCase();
  const page = parsePositiveInteger(query.page, 1, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 'limit', 100);

  const filter = {};

  if (ownerId) {
    filter.ownerId = ownerId;
  }

  if (status) {
    if (!PROJECT_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid project status filter', 'VALIDATION_ERROR');
    }

    filter.status = status;
  }

  if (q) {
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');

    filter.$or = [
      { projectId: searchRegex },
      { title: searchRegex },
      { description: searchRegex },
      { requiredSkill: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);

  return {
    items: items.map(sanitizeProject),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getProjectById = async (projectId) => {
  const normalizedProjectId = normalizeProjectId(projectId);
  const project = await Project.findOne({ projectId: normalizedProjectId }).lean();

  if (!project) {
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  return sanitizeProject(project);
};

const updateProject = async (currentUser, projectId, payload) => {
  const user = ensureAuthenticatedUser(currentUser);
  const project = await getProjectDocumentById(projectId);

  ensureProjectOwner(project, user.userId);

  if (payload.title !== undefined) {
    project.title = payload.title;
  }

  if (payload.description !== undefined) {
    project.description = payload.description;
  }

  if (payload.requiredSkill !== undefined) {
    project.requiredSkill = payload.requiredSkill;
  }

  if (payload.status !== undefined) {
    project.status = payload.status;
  }

  await project.save();

  return sanitizeProject(project);
};

const deleteProject = async (currentUser, projectId) => {
  const user = ensureAuthenticatedUser(currentUser);
  const project = await getProjectDocumentById(projectId);

  ensureProjectOwner(project, user.userId);
  await project.deleteOne();

  return sanitizeProject(project);
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
