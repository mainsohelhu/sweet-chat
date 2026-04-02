const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createStory, getStories, getSingleStory, viewStory,
  reactToStory, messageStory, deleteStory,
} = require('../controllers/storyController');

router.get('/', protect, getStories);
router.get('/single/:storyId', protect, getSingleStory);
router.post('/', protect, createStory);
router.post('/:storyId/view', protect, viewStory);
router.post('/:storyId/react', protect, reactToStory);
router.post('/:storyId/message', protect, messageStory);
router.delete('/:storyId', protect, deleteStory);

module.exports = router;