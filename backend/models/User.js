const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    username: { type: String, sparse: true, lowercase: true, trim: true, maxlength: 30 },
    email: { type: String, sparse: true, lowercase: true, trim: true },
    phone: { type: String, sparse: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    avatar: { type: String, default: null },
    bio: { type: String, default: '', maxlength: 200 },
    statusMessage: { type: String, default: 'Hey there! I am using Sweetchat.', maxlength: 150 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpire: Date,
    otp: String,
    otpExpire: Date,
    publicKey: { type: String, default: null },
    pushSubscription: { type: Object, default: null },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
    },
    refreshTokens: [String],
    // Archived posts
    archivedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);

userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) this.invalidate('email', 'Either email or phone is required');
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.avatar) {
    const name = encodeURIComponent(this.displayName || this.username || 'User');
    this.avatar = `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=ffffff&size=128`;
  }
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (p) {
  return bcrypt.compare(p, this.password);
};

userSchema.methods.toPublicProfile = function () {
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.displayName || 'User')}&background=6366f1&color=ffffff&size=128`;
  return {
    _id: this._id,
    displayName: this.displayName,
    username: this.username,
    email: this.email,
    phone: this.phone,
    avatar: this.avatar || defaultAvatar,
    bio: this.bio,
    statusMessage: this.statusMessage,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    isVerified: this.isVerified,
    isPrivate: this.isPrivate,
    preferences: this.preferences,
    publicKey: this.publicKey,
  };
};

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ username: 1 });
userSchema.index({ displayName: 'text', username: 'text' });

module.exports = mongoose.model('User', userSchema);