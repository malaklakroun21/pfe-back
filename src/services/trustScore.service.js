const Project = require('../models/Project');
const Skill = require('../models/Skill');
const User = require('../models/User');
const Endorsement = require('../models/Endorsement');
const ApiError = require('../utils/ApiError');
const { TRUST_BADGE_TIERS, TRUST_WEIGHTS } = require('../constants/mechanics');

const normalizeSkillName = (name = '') => name.trim().toLowerCase();

// Portfolio score (P) from linked platforms + Fenneky project activity.
const calculatePortfolioScore = ({
  linkedPlatforms = [],
  hasPortfolioUrl = false,
  activeProjectCount = 0,
  completedFennekyProjectCount = 0,
}) => {
  const platforms = [...new Set(linkedPlatforms.map((p) => p?.trim()).filter(Boolean))];
  const platformCount = platforms.length + (hasPortfolioUrl ? 1 : 0);

  if (platformCount === 0 && activeProjectCount === 0 && completedFennekyProjectCount === 0) {
    return 0;
  }

  if (platformCount >= 2 && completedFennekyProjectCount >= 2 && activeProjectCount >= 1) {
    return 95;
  }

  if (platformCount >= 2 && (activeProjectCount >= 1 || completedFennekyProjectCount >= 1)) {
    return 75;
  }

  if (platformCount >= 2) {
    return 55;
  }

  if (platformCount >= 1) {
    return 30;
  }

  if (activeProjectCount >= 1 || completedFennekyProjectCount >= 1) {
    return 40;
  }

  return 0;
};

// Endorsement score (E) from collaborator endorsement count.
const calculateEndorsementScore = (endorsementsCount = 0) => {
  const count = Math.max(0, Number(endorsementsCount) || 0);

  if (count === 0) {
    return 0;
  }

  if (count === 1) {
    return 20;
  }

  if (count === 2) {
    return 35;
  }

  if (count <= 5) {
    return 50 + Math.round(((count - 3) / 2) * 20);
  }

  if (count <= 9) {
    return 75 + Math.round(((count - 6) / 3) * 13);
  }

  return 95;
};

const calculateTrustScore = (portfolioScore, endorsementScore) => {
  const p = Math.min(100, Math.max(0, Number(portfolioScore) || 0));
  const e = Math.min(100, Math.max(0, Number(endorsementScore) || 0));
  const raw = TRUST_WEIGHTS.portfolio * p + TRUST_WEIGHTS.endorsement * e;

  return Math.min(100, Math.max(0, Math.round(raw)));
};

const calculateBadge = (trustScore) => {
  const score = Math.min(100, Math.max(0, Number(trustScore) || 0));
  const tier =
    TRUST_BADGE_TIERS.find((entry) => score >= entry.min && score <= entry.max) ||
    TRUST_BADGE_TIERS[0];

  return {
    trustBadge: tier.badge,
    trustModifier: tier.modifier,
  };
};

const calculateModifier = (trustScore) => calculateBadge(trustScore).trustModifier;

const countActiveProjectsForSkill = async (userId, skillName) => {
  const normalizedSkill = normalizeSkillName(skillName);

  const projects = await Project.find({
    status: { $in: ['IN_PROGRESS', 'COMPLETED'] },
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  }).lean();

  return projects.filter((project) => {
    return normalizeSkillName(project.requiredSkill) === normalizedSkill;
  }).length;
};

const countCompletedFennekyProjectsForSkill = async (userId, skillName) => {
  const normalizedSkill = normalizeSkillName(skillName);

  return Project.countDocuments({
    status: 'COMPLETED',
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
    requiredSkill: new RegExp(`^${normalizedSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });
};

const buildPortfolioContextForSkill = async (userId, skillDoc) => {
  const user = await User.findOne({ userId }).lean();

  const [activeProjectCount, completedFennekyProjectCount] = await Promise.all([
    countActiveProjectsForSkill(userId, skillDoc.skillName),
    countCompletedFennekyProjectsForSkill(userId, skillDoc.skillName),
  ]);

  return {
    linkedPlatforms: skillDoc.linkedPlatforms || [],
    hasPortfolioUrl: Boolean(user?.portfolioUrl?.trim()),
    activeProjectCount,
    completedFennekyProjectCount,
  };
};

const recalculateSkillTrust = async (skillDoc) => {
  const endorsementsCount = await Endorsement.countDocuments({
    toUserId: skillDoc.userId,
    skillId: skillDoc.skillId,
  });

  const portfolioContext = await buildPortfolioContextForSkill(skillDoc.userId, skillDoc);
  const portfolioScore = calculatePortfolioScore(portfolioContext);
  const endorsementScore = calculateEndorsementScore(endorsementsCount);
  const trustScore = calculateTrustScore(portfolioScore, endorsementScore);
  const { trustBadge, trustModifier } = calculateBadge(trustScore);

  skillDoc.portfolioScore = portfolioScore;
  skillDoc.endorsementScore = endorsementScore;
  skillDoc.endorsementsCount = endorsementsCount;
  skillDoc.trustScore = trustScore;
  skillDoc.trustBadge = trustBadge;
  skillDoc.trustModifier = trustModifier;
  skillDoc.lastUpdated = new Date();

  await skillDoc.save();

  return skillDoc.toObject ? skillDoc.toObject() : skillDoc;
};

const recalculateSkillTrustById = async (skillId) => {
  const skill = await Skill.findOne({ skillId });

  if (!skill) {
    throw new ApiError(404, 'Skill not found', 'SKILL_NOT_FOUND');
  }

  return recalculateSkillTrust(skill);
};

const getTrustProfileForUser = async (userId) => {
  const skills = await Skill.find({ userId }).sort({ trustScore: -1, skillName: 1 }).lean();

  return {
    userId,
    skills: skills.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      skillTier: skill.skillTier,
      trustScore: skill.trustScore,
      trustBadge: skill.trustBadge,
      trustModifier: skill.trustModifier,
      portfolioScore: skill.portfolioScore,
      endorsementScore: skill.endorsementScore,
      endorsementsCount: skill.endorsementsCount,
      linkedPlatforms: skill.linkedPlatforms || [],
      mentorValidated: skill.mentorValidated,
      validationStatus: skill.validationStatus,
    })),
  };
};

const getUserSkillsWithTrust = async (userId) => {
  return getTrustProfileForUser(userId);
};

module.exports = {
  calculatePortfolioScore,
  calculateEndorsementScore,
  calculateTrustScore,
  calculateBadge,
  calculateModifier,
  recalculateSkillTrust,
  recalculateSkillTrustById,
  getTrustProfileForUser,
  getUserSkillsWithTrust,
};
