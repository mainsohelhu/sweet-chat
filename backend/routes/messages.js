// routes/messages.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendMessage, getMessages, deleteMessage,
  searchMessages, addReaction,
} = require('../controllers/messageController');

router.post('/', protect, sendMessage);
router.get('/:chatId', protect, getMessages);
router.get('/:chatId/search', protect, searchMessages);
router.delete('/:messageId', protect, deleteMessage);
router.post('/:messageId/react', protect, addReaction);

module.exports = router;
