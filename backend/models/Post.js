const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, default: '' },
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video', null] },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  visibility: { type: String, enum: ['friends', 'everyone'], default: 'friends' },
  archived: { type: Boolean, default: false },
  shares: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, sharedAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

postSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Post', postSchema);