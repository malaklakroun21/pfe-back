const Joi = require('joi');

const {
  ADMIN_ASSIGNABLE_ROLES,
  ADMIN_PERMISSION_KEYS,
  REPORT_STATUSES,
  USER_ACCOUNT_STATUSES,
} = require('../constants/admin');

const adminRoleSchema = Joi.string().trim().valid(...ADMIN_ASSIGNABLE_ROLES);
const adminPermissionSchema = Joi.string().trim().valid(...ADMIN_PERMISSION_KEYS);

const updateUserByAdminSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).optional(),
  email: Joi.string().email().trim().lowercase().optional(),
  role: adminRoleSchema.optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

const updateRoleSchema = Joi.object({
  role: adminRoleSchema.required(),
});

const updatePermissionsSchema = Joi.object({
  permissions: Joi.array().items(adminPermissionSchema).min(1).unique().required(),
});

const updateStatusSchema = Joi.object({
  accountStatus: Joi.string().trim().uppercase().valid(...USER_ACCOUNT_STATUSES).required(),
  reason: Joi.string().trim().max(500).allow('').optional(),
});

const updateReportSchema = Joi.object({
  reportStatus: Joi.string().trim().uppercase().valid(...REPORT_STATUSES).required(),
  resolution: Joi.string().trim().max(1000).allow('').optional(),
});

const updateSettingSchema = Joi.object({
  value: Joi.alternatives()
    .try(Joi.string(), Joi.number(), Joi.boolean())
    .required(),
  description: Joi.string().trim().max(500).allow('').optional(),
});

module.exports = {
  updateUserByAdminSchema,
  updateRoleSchema,
  updatePermissionsSchema,
  updateStatusSchema,
  updateReportSchema,
  updateSettingSchema,
};
