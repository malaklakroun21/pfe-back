const express = require('express');

const adminController = require('../controllers/adminController');
const requireAdminPermissions = require('../middleware/admin-permissions.middleware');
const protect = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/authorize');
const validate = require('../middleware/validate.middleware');
const {
  updatePermissionsSchema,
  updateReportSchema,
  updateRoleSchema,
  updateSettingSchema,
  updateStatusSchema,
  updateUserByAdminSchema,
} = require('../validators/admin.validator');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'ADMIN'));

router.get('/dashboard', requireAdminPermissions('view_dashboard'), adminController.getDashboard);
router.get('/audit-logs', requireAdminPermissions('view_audit_logs'), adminController.getAuditLogs);
router.get('/reports', requireAdminPermissions('review_reports'), adminController.getReports);
router.patch(
  '/reports/:id',
  requireAdminPermissions('review_reports'),
  validate(updateReportSchema),
  adminController.updateReport
);
router.get('/settings', requireAdminPermissions('manage_settings'), adminController.getSettings);
router.put(
  '/settings/:key',
  requireAdminPermissions('manage_settings'),
  validate(updateSettingSchema),
  adminController.updateSetting
);
router.get('/users', requireAdminPermissions('manage_users'), adminController.getAllUsers);
router.get('/users/:id', requireAdminPermissions('manage_users'), adminController.getSingleUser);
router.put(
  '/users/:id',
  requireAdminPermissions('manage_users'),
  validate(updateUserByAdminSchema),
  adminController.updateUser
);
router.delete('/users/:id', requireAdminPermissions('manage_users'), adminController.deleteUser);
router.patch(
  '/users/:id/role',
  requireAdminPermissions('manage_admins'),
  validate(updateRoleSchema),
  adminController.updateUserRole
);
router.patch(
  '/users/:id/permissions',
  requireAdminPermissions('manage_admins'),
  validate(updatePermissionsSchema),
  adminController.updateUserPermissions
);
router.patch(
  '/users/:id/status',
  requireAdminPermissions('moderate_users'),
  validate(updateStatusSchema),
  adminController.updateUserStatus
);

module.exports = router;
