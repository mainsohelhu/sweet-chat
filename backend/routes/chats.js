// routes/chats.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getChats, getOrCreateDirectChat, createGroupChat,
  getChat, addParticipants, leaveGroup, acceptChatRequest,
} = require('../controllers/chatController');

router.get('/', protect, getChats);
router.get('/:chatId', protect, getChat);
router.get('/direct/:userId', protect, getOrCreateDirectChat);
router.post('/group', protect, createGroupChat);
router.put('/:chatId/participants', protect, addParticipants);
router.delete('/:chatId/leave', protect, leaveGroup);
router.put('/:chatId/request', protect, acceptChatRequest);

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// routes/messages.js  (in separate file referenced below)
