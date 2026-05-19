const Skill = require('../models/Skill');
const ApiError = require('../utils/ApiError');
const { SKILL_TIER_MULTIPLIERS, MENTOR_ROLES } = require('../constants/mechanics');
const trustScoreService = require('./trustScore.service');

const isMentorOrAdmin = (user) => MENTOR_ROLES.has(String(user?.role || '').toUpperCase());

const ensureMentorOrAdmin = (user) => {
  if (!isMentorOrAdmin(user)) {
    throw new ApiError(403, 'Only mentors or admins can assign skill tiers', 'FORBIDDEN');
  }
};

const normalizeSkillTier = (tier) => {
  const normalized = String(tier || '').trim().toUpperCase();

  if (!SKILL_TIER_MULTIPLIERS[normalized]) {
    throw new ApiError(400, 'Invalid skill tier', 'VALIDATION_ERROR');
  }

  return normalized;
};

const assignSkillTier = async (actor, skillId, skillTier) => {
  ensureMentorOrAdmin(actor);

  const skill = await Skill.findOne({ skillId: skillId?.trim() });

  if (!skill) {
    throw new ApiError(404, 'Skill not found', 'SKILL_NOT_FOUND');
  }

  skill.skillTier = normalizeSkillTier(skillTier);
  skill.mentorValidated = true;
  skill.lastUpdated = new Date();
  await skill.save();

  return skill.toObject();
};

const updateSkillPlatforms = async (userId, skillId, linkedPlatforms = []) => {
  const skill = await Skill.findOne({ userId, skillId: skillId?.trim() });

  if (!skill) {
    throw new ApiError(404, 'Skill not found', 'SKILL_NOT_FOUND');
  }

  skill.linkedPlatforms = [...new Set(linkedPlatforms.map((p) => String(p).trim()).filter(Boolean))];
  await trustScoreService.recalculateSkillTrust(skill);

  return skill.toObject ? skill.toObject() : skill;
};

const findTeacherSkillForSession = async (teacherId, skillName) => {
  const skill = await Skill.findOne({
    userId: teacherId,
    skillName: new RegExp(`^${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });

  if (skill) {
    return skill;
  }

  return Skill.findOne({ userId: teacherId }).sort({ trustScore: -1 });
};

module.exports = {
  assignSkillTier,
  updateSkillPlatforms,
  findTeacherSkillForSession,
  isMentorOrAdmin,
};
