const skillService = require('../services/skill.service');
const trustScoreService = require('../services/trustScore.service');
const ApiResponse = require('../utils/ApiResponse');

const getUserSkills = async (req, res, next) => {
  try {
    const profile = await trustScoreService.getUserSkillsWithTrust(req.params.userId);
    res.status(200).json(new ApiResponse(200, profile, 'User skills fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const assignSkillTier = async (req, res, next) => {
  try {
    const skill = await skillService.assignSkillTier(req.user, req.params.skillId, req.body.skillTier);
    const updated = await trustScoreService.recalculateSkillTrustById(skill.skillId);
    res.status(200).json(new ApiResponse(200, updated, 'Skill tier assigned successfully'));
  } catch (error) {
    next(error);
  }
};

const updateSkillPlatforms = async (req, res, next) => {
  try {
    const skill = await skillService.updateSkillPlatforms(
      req.user.userId,
      req.params.skillId,
      req.body.linkedPlatforms
    );
    res.status(200).json(new ApiResponse(200, skill, 'Skill platforms updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserSkills,
  assignSkillTier,
  updateSkillPlatforms,
};
