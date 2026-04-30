const express = require('express');

const messageController = require('../controllers/message.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { sendMessageSchema } = require('../validators/message.validator');

const router = express.Router();

router.use(protect);

router.post('/', validate(sendMessageSchema), messageController.sendMessage);
router.get('/conversations', messageController.listConversations);
router.get('/with/:userId', messageController.getConversationWithUser);
router.patch('/:id/read', messageController.markMessageAsRead);

module.exports = router;
