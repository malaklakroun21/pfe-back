const express = require('express');

const sessionController = require('../controllers/session.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createSessionRequestSchema } = require('../validators/session.validator');

const router = express.Router();

router.use(protect);

// Learner creates a session request.
router.post('/request', validate(createSessionRequestSchema), sessionController.requestSession);
// User lists own sessions (teacher/learner filters supported).
router.get('/', sessionController.listSessions);
// Teacher actions.
router.patch('/:id/accept', sessionController.acceptSession);
router.patch('/:id/reject', sessionController.rejectSession);
// Session completion triggers credit transfer.
router.patch('/:id/complete', sessionController.completeSession);

module.exports = router;
