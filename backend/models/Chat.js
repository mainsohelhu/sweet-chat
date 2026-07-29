/**
 * Chat Model
 * Represents a conversation (1-to-1 or group)
 */

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      trim: true,
      // Required for group chats only
    },
    description: {
      type: String,
      maxlength: 200,
    },
    avatar: {
      type: String,
      default: null,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    status: {
      type: String,
      enum: ['accepted', 'pending', 'declined'],
      default: 'accepted',
    },
    // Per-user mute/archive settings
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    disappearingTimer: { type: Number, default: 0 }, // 0 = off, 3600 = 1h, 86400 = 24h, 604800 = 7d
    wallpaper: { type: String, default: 'default' },
  },
  {
    timestamps: true,
  }
);

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
