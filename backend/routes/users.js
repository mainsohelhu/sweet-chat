// ─── routes/users.js ─────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const xss = require('xss');

// Search users by username or displayName only (no email)
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ success: true, users: [] });
    const safeQuery = xss(q.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [
          { displayName: { $regex: safeQuery, $options: 'i' } },
          { username: { $regex: safeQuery, $options: 'i' } },
        ]},
      ],
    }).select('displayName username avatar isOnline lastSeen statusMessage bio').limit(20).lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

// Get user profile
router.get('/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('displayName email phone avatar isOnline lastSeen statusMessage');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
});

// Update own profile
router.put('/me/profile', protect, async (req, res) => {
  try {
    const { displayName, statusMessage, preferences } = req.body;
    const updates = {};
    if (displayName) updates.displayName = xss(displayName.trim());
    if (statusMessage !== undefined) updates.statusMessage = xss(statusMessage.trim());
    if (preferences) updates.preferences = preferences;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// Add contact
router.post('/contacts/:userId', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { contacts: req.params.userId } },
      { new: true }
    ).populate('contacts', 'displayName avatar isOnline lastSeen statusMessage');
    res.json({ success: true, contacts: user.contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add contact.' });
  }
});

// Remove contact
router.delete('/contacts/:userId', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { contacts: req.params.userId } });
    res.json({ success: true, message: 'Contact removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove contact.' });
  }
});

// Get contacts
router.get('/me/contacts', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', 'displayName avatar isOnline lastSeen statusMessage email phone');
    res.json({ success: true, contacts: user.contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch contacts.' });
  }
});

// Block user
router.post('/block/:userId', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: req.params.userId },
      $pull: { contacts: req.params.userId },
    });
    res.json({ success: true, message: 'User blocked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to block user.' });
  }
});

// Upload/update public key (called after key pair generation on client)
router.post('/me/public-key', protect, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ success: false, message: 'Public key required' });
    await User.findByIdAndUpdate(req.user._id, { publicKey });
    res.json({ success: true, message: 'Public key updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update public key' });
  }
});

// Get a user's public key (needed to encrypt messages for them)
router.get('/:userId/public-key', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('publicKey displayName');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, publicKey: user.publicKey });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get public key' });
  }
});

// Delete own account
router.delete('/me', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete all messages sent by user
    await require('../models/Message').deleteMany({ sender: userId });

    // Remove user from all chats
    const Chat = require('../models/Chat');
    await Chat.updateMany(
      { participants: userId },
      { $pull: { participants: userId, admins: userId } }
    );

    // Delete chats where user was the only participant
    await Chat.deleteMany({ participants: { $size: 0 } });

    // Delete the user
    await require('../models/User').findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
});

// Change password
router.put('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'All fields required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });
    const user = await require('../models/User').findById(req.user._id).select('+password');
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// Remove avatar (reset to default)
router.delete('/me/avatar', protect, async (req, res) => {
  try {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.displayName || 'User')}&background=6366f1&color=ffffff&size=128`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: defaultAvatar }, { new: true });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove avatar' });
  }
});

// Update profile (bio, username, isPrivate, displayName, statusMessage)
router.put('/me/settings', protect, async (req, res) => {
  try {
    const { bio, username, isPrivate, displayName, statusMessage } = req.body;
    const User = require('../models/User');
    if (username) {
      const exists = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Username taken' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
      ...(bio !== undefined && { bio }),
      ...(username && { username: username.toLowerCase() }),
      ...(isPrivate !== undefined && { isPrivate }),
      ...(displayName && { displayName }),
      ...(statusMessage !== undefined && { statusMessage }),
    }, { new: true });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// Get user profile by id (public)
router.get('/:userId/profile', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const Friend = require('../models/Friend');
    const Post = require('../models/Post');
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const friendship = await Friend.findOne({
      $or: [{ requester: req.user._id, recipient: user._id }, { requester: user._id, recipient: req.user._id }],
      status: 'accepted',
    });
    const isFriend = !!friendship;
    // Get posts — if private, only show to friends
    let posts = [];
    if (!user.isPrivate || isFriend || user._id.toString() === req.user._id.toString()) {
      posts = await Post.find({ user: user._id, archived: { $ne: true } }).sort({ createdAt: -1 }).limit(20).populate('user', 'displayName avatar');
    }
    res.json({ success: true, user: user.toPublicProfile(), isFriend, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

// User suggestions (people you may know)
router.get('/suggestions', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const Friend = require('../models/Friend');
    const friends = await Friend.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] });
    const connectedIds = friends.map(f =>
      f.requester.toString() === req.user._id.toString() ? f.recipient.toString() : f.requester.toString()
    );
    const suggestions = await User.find({
      _id: { $nin: [...connectedIds, req.user._id] },
    }).limit(8).select('displayName avatar username bio isOnline');
    res.json({ success: true, suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

module.exports = router;