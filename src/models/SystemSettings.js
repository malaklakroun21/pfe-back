const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    settingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    settingKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    settingValue: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: String,
      trim: true,
      ref: 'User',
    },
    updatedAt: {
      type: Date,
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.SystemSettings ||
  mongoose.model('SystemSettings', systemSettingsSchema);