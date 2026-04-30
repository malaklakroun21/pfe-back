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

const updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateCurrentUser(req.user, req.body);
    res.status(200).json(new ApiResponse(200, user, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserPublicProfile(req.params.id);
    res.status(200).json(new ApiResponse(200, user, 'Public profile fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Users fetched successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  getUserById,
  listUsers,
};
