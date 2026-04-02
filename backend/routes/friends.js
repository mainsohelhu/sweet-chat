const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendRequest, respondToRequest, removeFriend,
  getFriends, getPendingRequests, getStatus,
} = require('../controllers/friendController');

router.get('/', protect, getFriends);
router.get('/requests', protect, getPendingRequests);
router.get('/status/:userId', protect, getStatus);
router.post('/request/:userId', protect, sendRequest);
router.put('/request/:requestId', protect, respondToRequest);
router.delete('/:userId', protect, removeFriend);
module.exports = router;
