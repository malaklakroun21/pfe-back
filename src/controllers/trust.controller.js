const trustScoreService = require('../services/trustScore.service');
const ApiResponse = require('../utils/ApiResponse');

const getUserTrust = async (req, res, next) => {
  try {
    const profile = await trustScoreService.getTrustProfileForUser(req.params.userId);
    res.status(200).json(new ApiResponse(200, profile, 'Trust profile fetched successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserTrust,
};
