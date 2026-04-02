const Post = require('../models/Post');
const { createNotification } = require('../utils/notify');
const Friend = require('../models/Friend');

const getFriendIds = async (userId) => {
  const friends = await Friend.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  });
  return friends.map(f =>
    f.requester.toString() === userId.toString() ? f.recipient : f.requester
  );
};

// Create post
exports.createPost = async (req, res) => {
  try {
    const { caption, mediaUrl, mediaType, visibility } = req.body;
    if (!caption?.trim() && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Post needs content' });
    }
    const post = await Post.create({
      user: req.user._id, caption, mediaUrl, mediaType, visibility: visibility || 'friends',
    });
    await post.populate('user', 'displayName avatar');
    const io = req.app.get('io');
    const friendIds = await getFriendIds(req.user._id);
    friendIds.forEach(fid => io.to(`user:${fid}`).emit('new_post', { post }));
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
};

// Get feed (own + friends posts)
exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const friendIds = await getFriendIds(req.user._id);
    const posts = await Post.find({
      $or: [
        { user: { $in: [...friendIds, req.user._id] } },
        { visibility: 'everyone' },
      ],
    })
      .populate('user', 'displayName avatar')
      .populate('comments.user', 'displayName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Post.countDocuments({ user: { $in: [...friendIds, req.user._id] } });
    res.json({ success: true, posts, hasMore: page * limit < total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get feed' });
  }
};

// Like / unlike post
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    const liked = post.likes.includes(req.user._id);
    if (liked) post.likes.pull(req.user._id);
    else post.likes.push(req.user._id);
    await post.save();
    const io = req.app.get('io');
    if (!liked) {
      await createNotification(io, {
        recipient: post.user,
        sender: req.user._id,
        type: 'post_like',
        refId: post._id,
        refModel: 'Post',
        text: `${req.user.displayName} liked your post`,
      });
    }
    io.to(`user:${post.user}`).emit('post_liked', { postId: post._id, likes: post.likes.length, liked: !liked, by: req.user.displayName });
    res.json({ success: true, likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment required' });
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    post.comments.push({ user: req.user._id, text: text.trim() });
    await post.save();
    await post.populate('comments.user', 'displayName avatar');
    const newComment = post.comments[post.comments.length - 1];
    const io = req.app.get('io');
    await createNotification(io, {
      recipient: post.user,
      sender: req.user._id,
      type: 'post_comment',
      refId: post._id,
      refModel: 'Post',
      text: `${req.user.displayName} commented: "${text.trim().slice(0,40)}${text.length > 40 ? '...' : ''}"`,
    });
    io.to(`user:${post.user}`).emit('post_commented', { postId: post._id, comment: newComment });
    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.postId, user: req.user._id });
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    post.comments = post.comments.filter(c =>
      !(c._id.toString() === req.params.commentId &&
        (c.user.toString() === req.user._id.toString() || post.user.toString() === req.user._id.toString()))
    );
    await post.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Archive / unarchive post
exports.toggleArchive = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.postId, user: req.user._id });
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    post.archived = !post.archived;
    await post.save();
    res.json({ success: true, archived: post.archived });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Share post
exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    const alreadyShared = post.shares?.some(s => s.user?.toString() === req.user._id.toString());
    if (!alreadyShared) {
      post.shares = post.shares || [];
      post.shares.push({ user: req.user._id });
      await post.save();
    }
    const io2 = req.app.get('io');
    if (!alreadyShared) {
      await createNotification(io2, {
        recipient: post.user,
        sender: req.user._id,
        type: 'post_share',
        refId: post._id,
        refModel: 'Post',
        text: `${req.user.displayName} shared your post`,
      });
    }
    res.json({ success: true, shares: post.shares?.length || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Get archived posts for current user
exports.getArchivedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id, archived: true })
      .populate('user', 'displayName avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};