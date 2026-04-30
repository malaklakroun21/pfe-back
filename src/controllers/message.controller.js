const messageService = require('../services/message.service');
const ApiResponse = require('../utils/ApiResponse');

const sendMessage = async (req, res, next) => {
  try {
    const result = await messageService.sendMessage(req.user, req.body);
    res.status(201).json(new ApiResponse(201, result, 'Message sent successfully'));
  } catch (error) {
    next(error);
  }
};

const listConversations = async (req, res, next) => {
  try {
    const result = await messageService.listConversations(req.user);
    res.status(200).json(new ApiResponse(200, result, 'Conversations fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const getConversationWithUser = async (req, res, next) => {
  try {
    const result = await messageService.getConversationWithUser(req.user, req.params.userId);
    res.status(200).json(new ApiResponse(200, result, 'Conversation fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const markMessageAsRead = async (req, res, next) => {
  try {
    const result = await messageService.markMessageAsRead(req.user, req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Message marked as read'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  listConversations,
  getConversationWithUser,
  markMessageAsRead,
};
