const { randomUUID } = require('crypto');

const Endorsement = require('../models/Endorsement');
const Session = require('../models/Session');
const Project = require('../models/Project');
const Skill = require('../models/Skill');
const ApiError = require('../utils/ApiError');
const trustScoreService = require('./trustScore.service');

const normalizeUserId = (userId) => {
  const normalized = userId?.trim();

  if (!normalized) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  return normalized;
};

const getCompletedCollaboration = async ({ sessionId, projectId, userId, targetUserId }) => {
  if (sessionId) {
    const session = await Session.findOne({ sessionId: sessionId.trim() }).lean();

    if (!session || session.status !== 'COMPLETED' || !session.endorsementsUnlocked) {
      return null;
    }

    const participants = new Set([session.teacherId, session.learnerId]);

    if (!participants.has(userId) || !participants.has(targetUserId)) {
      return null;
    }

    return { type: 'session', record: session, skillName: session.skill };
  }

  if (projectId) {
    const project = await Project.findOne({ projectId: projectId.trim() }).lean();

    if (!project || project.status !== 'COMPLETED') {
      return null;
    }

    const memberIds = new Set([
      project.ownerId,
      ...(project.members || []).map((member) => member.userId),
    ]);

    if (!memberIds.has(userId) || !memberIds.has(targetUserId)) {
      return null;
    }

    return { type: 'project', record: project, skillName: project.requiredSkill };
  }

  return null;
};

const canEndorse = async (fromUserId, toUserId, { sessionId, projectId, skillId }) => {
  const normalizedFrom = normalizeUserId(fromUserId);
  const normalizedTo = normalizeUserId(toUserId);

  if (normalizedFrom === normalizedTo) {
    throw new ApiError(400, 'You cannot endorse yourself', 'VALIDATION_ERROR');
  }

  if (!sessionId && !projectId) {
    throw new ApiError(400, 'sessionId or projectId is required', 'VALIDATION_ERROR');
  }

  const collaboration = await getCompletedCollaboration({
    sessionId,
    projectId,
    userId: normalizedFrom,
    targetUserId: normalizedTo,
  });

  if (!collaboration) {
    throw new ApiError(
      403,
      'Endorsements are only allowed after a completed collaboration',
      'ENDORSEMENT_NOT_ALLOWED'
    );
  }

  const skill = skillId
    ? await Skill.findOne({ skillId: skillId.trim(), userId: normalizedTo })
    : await Skill.findOne({
        userId: normalizedTo,
        skillName: new RegExp(
          `^${collaboration.skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      });

  if (!skill) {
    throw new ApiError(404, 'Skill not found for this user', 'SKILL_NOT_FOUND');
  }

  const existing = await Endorsement.findOne({
    fromUserId: normalizedFrom,
    toUserId: normalizedTo,
    skillId: skill.skillId,
    ...(sessionId ? { sessionId: sessionId.trim() } : {}),
  });

  if (existing) {
    throw new ApiError(409, 'You already endorsed this collaborator for this skill', 'ENDORSEMENT_EXISTS');
  }

  return { skill, collaboration };
};

const createEndorsement = async (fromUser, payload = {}) => {
  if (!fromUser?.userId) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  const { skill } = await canEndorse(fromUser.userId, payload.toUserId, {
    sessionId: payload.sessionId,
    projectId: payload.projectId,
    skillId: payload.skillId,
  });

  const endorsement = await Endorsement.create({
    endorsementId: `END-${randomUUID()}`,
    fromUserId: fromUser.userId,
    toUserId: payload.toUserId.trim(),
    skillId: skill.skillId,
    skillName: skill.skillName,
    sessionId: payload.sessionId?.trim() || null,
    projectId: payload.projectId?.trim() || null,
    message: payload.message?.trim() || '',
  });

  const updatedSkill = await trustScoreService.recalculateSkillTrustById(skill.skillId);

  return {
    endorsement: endorsement.toObject(),
    skill: updatedSkill,
  };
};

module.exports = {
  canEndorse,
  createEndorsement,
};
