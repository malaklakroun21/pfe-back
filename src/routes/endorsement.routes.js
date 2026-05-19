const express = require('express');

const endorsementController = require('../controllers/endorsement.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createEndorsementSchema } = require('../validators/mechanics.validator');

const router = express.Router();

router.use(protect);

router.post('/', validate(createEndorsementSchema), endorsementController.createEndorsement);

module.exports = router;
