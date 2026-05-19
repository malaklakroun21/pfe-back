const creditService = require('../services/credit.service');
const ApiResponse = require('../utils/ApiResponse');

const getMyCredits = async (req, res, next) => {
  try {
    const profile = await creditService.getCreditProfileForUser(req.user);
    res.status(200).json(new ApiResponse(200, profile, 'Credit profile fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const getCreditHistory = async (req, res, next) => {
  try {
    const history = await creditService.listCreditHistoryForUser(req.user.userId);
    res.status(200).json(new ApiResponse(200, history, 'Credit history fetched successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCredits,
  getCreditHistory,
};
