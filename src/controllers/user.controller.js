const userService = require('../services/user.service');
const ApiResponse = require('../utils/ApiResponse');

const getMe = async (req, res, next) => {
  try {
    const user = userService.getCurrentUser(req.user);
    res.status(200).json(new ApiResponse(200, user, 'Current user fetched successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
};
