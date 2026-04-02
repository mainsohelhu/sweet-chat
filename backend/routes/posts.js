const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createPost, getFeed, toggleLike, addComment, deletePost, deleteComment } = require('../controllers/postController');

router.get('/feed', protect, getFeed);
router.post('/', protect, createPost);
router.post('/:postId/like', protect, toggleLike);
router.post('/:postId/comment', protect, addComment);
router.delete('/:postId', protect, deletePost);
router.delete('/:postId/comment/:commentId', protect, deleteComment);

module.exports = router;

const { toggleArchive, sharePost, getArchivedPosts } = require('../controllers/postController');
router.get('/archived', protect, getArchivedPosts);
router.put('/:postId/archive', protect, toggleArchive);
router.post('/:postId/share', protect, sharePost);