const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
  {
    countryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phoneCode: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.Country || mongoose.model('Country', countrySchema);
