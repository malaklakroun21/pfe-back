const express = require('express');

const sessionController = require('../controllers/session.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createSessionRequestSchema,
  completeSessionSchema,
} = require('../validators/session.validator');

const router = express.Router();

router.use(protect);

// Learner creates a session request.
router.post('/request', validate(createSessionRequestSchema), sessionController.requestSession);
// Users with at least one validated skill (potential teachers).
router.get('/teachers', sessionController.getTeacherDirectory);
// User lists own sessions (teacher/learner filters supported).
router.get('/', sessionController.listSessions);
// User explores sessions across the app.
router.get('/explore', sessionController.listSessionsDirectory);
// Teacher actions.
router.patch('/:id/accept', sessionController.acceptSession);
router.patch('/:id/reject', sessionController.rejectSession);
router.patch('/:id/cancel', sessionController.cancelSession);
router.delete('/:id', sessionController.deleteSession);
// Session completion triggers credit transfer.
router.patch('/:id/complete', validate(completeSessionSchema), sessionController.completeSession);

module.exports = router;
