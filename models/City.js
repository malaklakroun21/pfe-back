const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    cityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    countryId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Country',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: mongoose.Schema.Types.Decimal128,
    },
    longitude: {
      type: mongoose.Schema.Types.Decimal128,
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

module.exports = mongoose.models.City || mongoose.model('City', citySchema);
