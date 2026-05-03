const express = require('express');

const sessionController = require('../controllers/session.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createSessionSchema } = require('../validators/session.validator');

const router = express.Router();

router.use(protect);

router.route('/').post(validate(createSessionSchema), sessionController.createSession);
router.patch('/:id/accept', sessionController.acceptSession);
router.patch('/:id/reject', sessionController.rejectSession);
router.patch('/:id/cancel', sessionController.cancelSession);

module.exports = router;
