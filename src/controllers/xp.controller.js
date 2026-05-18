const xpService = require('../services/xp.service');
const ApiResponse = require('../utils/ApiResponse');

// GET /api/v1/xp/me — authenticated user's XP summary + recent history.
const getMyXp = async (req, res, next) => {
  try {
    const profile = await xpService.getMyXpProfile(req.user.userId);
    res.status(200).json(new ApiResponse(200, profile, 'XP profile fetched successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/xp/:userId — public XP info for profile pages.
const getUserXp = async (req, res, next) => {
  try {
    const profile = await xpService.getPublicXpProfile(req.params.userId);
    res.status(200).json(new ApiResponse(200, profile, 'Public XP profile fetched successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyXp,
  getUserXp,
};
