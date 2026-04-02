// routes/calls.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Log a completed/missed call as a message
router.post('/log', protect, async (req, res) => {
  try {
    const { chatId, type, status, duration } = req.body;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      type: 'call',
      content: status === 'ended'
        ? `${type === 'video' ? '📹' : '📞'} ${type} call · ${formatDuration(duration)}`
        : `${type === 'video' ? '📹' : '📞'} Missed ${type} call`,
      callData: { type, status, duration: duration || 0 },
    });

    chat.lastMessage = message._id;
    await chat.save();

    const io = req.app.get('io');
    chat.participants.forEach((pid) => {
      io.to(`user:${pid}`).emit('new_message', { message, chatId });
    });

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log call.' });
  }
});

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

module.exports = router;
