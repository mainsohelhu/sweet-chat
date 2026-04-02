/**
 * Message Model
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },

    // E2E encrypted payload
    e2e: {
      type: new mongoose.Schema({
        ciphertext:      String,
        nonce:           String,
        senderPublicKey: String,
        isGroup:         Boolean,
        encryptedKeysList: [
          new mongoose.Schema({
            publicKey: String,
            key:       String,
            nonce:     String,
          }, { _id: false })
        ],
      }, { _id: false }),
      default: undefined,
    },

    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'gif', 'sticker', 'call', 'system'],
      default: 'text',
    },
    attachment: {
      url: String, filename: String, mimetype: String,
      size: Number, duration: Number, thumbnail: String,
      width: Number, height: Number,
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date, default: Date.now } }],
    deliveredTo: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, deliveredAt: { type: Date, default: Date.now } }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deletedForEveryone: { type: Boolean, default: false },
    deletedAt: Date,
    reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
    callData: {
      type: { type: String, enum: ['audio', 'video'] },
      status: { type: String, enum: ['missed', 'ended', 'rejected'] },
      duration: Number,
    },
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', messageSchema);