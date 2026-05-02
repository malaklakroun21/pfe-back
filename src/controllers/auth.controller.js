const asyncHandler = require('express-async-handler');

const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(new ApiResponse(201, result, 'User registered successfully'));
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body.email, req.body.password);
  res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user);
  res.status(200).json(new ApiResponse(200, user, 'Current user fetched successfully'));
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logoutUser(req.user);
  res.status(200).json(new ApiResponse(200, result, 'Logout successful'));
});

module.exports = {
  register,
  login,
  getMe,
  logout,
};
