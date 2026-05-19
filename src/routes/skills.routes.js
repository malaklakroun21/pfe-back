const express = require('express');

const skillController = require('../controllers/skill.controller');
const protect = require('../middleware/auth.middleware');
const requireMentorOrAdmin = require('../middleware/mentor.middleware');
const validate = require('../middleware/validate.middleware');
const {
  assignSkillTierSchema,
  updateSkillPlatformsSchema,
} = require('../validators/mechanics.validator');

const router = express.Router();

router.use(protect);

router.get('/:userId', skillController.getUserSkills);
router.patch(
  '/:skillId/tier',
  requireMentorOrAdmin,
  validate(assignSkillTierSchema),
  skillController.assignSkillTier
);
router.patch(
  '/:skillId/platforms',
  validate(updateSkillPlatformsSchema),
  skillController.updateSkillPlatforms
);

module.exports = router;
