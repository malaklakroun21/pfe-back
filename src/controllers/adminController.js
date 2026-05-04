const adminService = require('../services/admin.service');
const ApiResponse = require('../utils/ApiResponse');

const getAllUsers = async (req, res, next) => {
  try {
    const result = await adminService.listUsers(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Users fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const getSingleUser = async (req, res, next) => {
  try {
    const user = await adminService.getSingleUser(req.params.id);
    res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, user, 'User updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const deleted = await adminService.deleteUser(req.params.id, req.user.userId);
    res.status(200).json(new ApiResponse(200, deleted, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    res.status(200).json(new ApiResponse(200, user, 'User role updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  updateUserRole,
};
