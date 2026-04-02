const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'friend_request',
      'friend_accepted',
      'post_like',
      'post_comment',
      'post_share',
      'story_reaction',
      'story_message',
      'new_message',
      'mention',
    ],
    required: true,
  },
  // Reference to the related content
  refId: { type: mongoose.Schema.Types.ObjectId },
  refModel: { type: String, enum: ['Post', 'Chat', 'Story', 'Friend'] },
  // Human readable text
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);