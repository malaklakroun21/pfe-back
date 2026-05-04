const express = require('express');

const adminController = require('../controllers/adminController');
const protect = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/authorize');
const validate = require('../middleware/validate.middleware');
const { updateUserByAdminSchema, updateRoleSchema } = require('../validators/admin.validator');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'ADMIN'));

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getSingleUser);
router.put('/users/:id', validate(updateUserByAdminSchema), adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/role', validate(updateRoleSchema), adminController.updateUserRole);

module.exports = router;
