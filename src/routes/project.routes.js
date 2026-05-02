const express = require('express');

const projectController = require('../controllers/project.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(validate(createProjectSchema), projectController.createProject)
  .get(projectController.listProjects);

router.post('/:id/join', projectController.joinProject);
router.post('/:id/leave', projectController.leaveProject);
router.delete('/:id/members/:userId', projectController.removeProjectMember);

router
  .route('/:id')
  .get(projectController.getProjectById)
  .put(validate(updateProjectSchema), projectController.updateProject)
  .delete(projectController.deleteProject);

module.exports = router;
