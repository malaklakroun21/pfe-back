const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { signAccessToken } = require('../utils/jwt');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const skillOfferedSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    level: {
      type: String,
      required: true,
      enum: ['beginner', 'intermediate', 'expert'],
      lowercase: true,
      trim: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const skillWantedSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (v) => emailRegex.test(v),
      message: 'Invalid email format',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'mentor', 'admin'],
    default: 'user',
    lowercase: true,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  avatar: {
    type: String,
    trim: true,
  },
  skillsOffered: {
    type: [skillOfferedSchema],
    default: [],
  },
  skillsWanted: {
    type: [skillWantedSchema],
    default: [],
  },
  credits: {
    type: Number,
    default: 10,
    min: 0,
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'skillsOffered.name': 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  return signAccessToken({
    sub: this._id.toString(),
    role: this.role,
  });
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
