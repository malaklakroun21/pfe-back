const express = require('express');
const router = express.Router();

const protect = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { updateMeSchema } = require('../validators/user.validator');

router.use(protect);

router.get('/', userController.listUsers);
router.get('/me', userController.getMe);
router.put('/me', validate(updateMeSchema), userController.updateMe);
router.get('/:id', userController.getUserById);

module.exports = router;
