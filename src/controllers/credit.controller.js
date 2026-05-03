const creditService = require('../services/credit.service');
const ApiResponse = require('../utils/ApiResponse');

// GET /credits/history for the authenticated user.
const getCreditHistory = async (req, res, next) => {
  try {
    const history = await creditService.listCreditHistoryForUser(req.user.userId);
    res.status(200).json(new ApiResponse(200, history, 'Credit history fetched successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreditHistory,
};
