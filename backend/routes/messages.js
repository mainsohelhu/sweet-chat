// routes/messages.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendMessage, getMessages, deleteMessage,
  searchMessages, addReaction, togglePinMessage,
  toggleStarMessage, votePoll, getStarredMessages,
} = require('../controllers/messageController');

router.post('/', protect, sendMessage);
router.get('/starred', protect, getStarredMessages);
router.get('/:chatId', protect, getMessages);
router.get('/:chatId/search', protect, searchMessages);
router.delete('/:messageId', protect, deleteMessage);
router.post('/:messageId/react', protect, addReaction);
router.put('/:messageId/pin', protect, togglePinMessage);
router.post('/:messageId/star', protect, toggleStarMessage);
router.post('/:messageId/poll-vote', protect, votePoll);

module.exports = router;
