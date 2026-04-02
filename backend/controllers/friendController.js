const Friend = require('../models/Friend');
const { createNotification } = require('../utils/notify');
const User = require('../models/User');

// Send friend request
exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) return res.status(400).json({ success: false, message: "Can't add yourself" });
    const exists = await Friend.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id },
      ]
    });
    if (exists) return res.status(400).json({ success: false, message: exists.status === 'accepted' ? 'Already friends' : 'Request already sent' });
    const request = await Friend.create({ requester: req.user._id, recipient: userId });
    await request.populate('requester', 'displayName avatar');
    await request.populate('recipient', 'displayName avatar');
    // Notify via socket
    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('friend_request', { request });
    await createNotification(io, {
      recipient: userId,
      sender: req.user._id,
      type: 'friend_request',
      refId: request._id,
      refModel: 'Friend',
      text: `${req.user.displayName} sent you a friend request`,
    });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send request' });
  }
};

// Accept/reject request
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    const request = await Friend.findOne({ _id: requestId, recipient: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    await request.save();
    await request.populate('requester', 'displayName avatar');
    const io = req.app.get('io');
    if (action === 'accept') {
      await createNotification(io, {
        recipient: request.requester._id,
        sender: req.user._id,
        type: 'friend_accepted',
        refId: request._id,
        refModel: 'Friend',
        text: `${req.user.displayName} accepted your friend request`,
      });
    }
    io.to(`user:${request.requester._id}`).emit('friend_request_response', { requestId, action, respondent: req.user });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to respond' });
  }
};

// Cancel / unfriend
exports.removeFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    await Friend.deleteOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id },
      ]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove' });
  }
};

// Get friends list
exports.getFriends = async (req, res) => {
  try {
    const friends = await Friend.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    }).populate('requester', 'displayName avatar isOnline lastSeen')
      .populate('recipient', 'displayName avatar isOnline lastSeen');
    const list = friends.map(f => {
      const friend = f.requester._id.toString() === req.user._id.toString() ? f.recipient : f.requester;
      return { friendshipId: f._id, user: friend };
    });
    res.json({ success: true, friends: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get friends' });
  }
};

// Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const received = await Friend.find({ recipient: req.user._id, status: 'pending' })
      .populate('requester', 'displayName avatar');
    const sent = await Friend.find({ requester: req.user._id, status: 'pending' })
      .populate('recipient', 'displayName avatar');
    res.json({ success: true, received, sent });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get requests' });
  }
};

// Get friendship status with a user
exports.getStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const friendship = await Friend.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id },
      ]
    });
    if (!friendship) return res.json({ success: true, status: 'none' });
    const isSender = friendship.requester.toString() === req.user._id.toString();
    res.json({ success: true, status: friendship.status, isSender, friendshipId: friendship._id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get status' });
  }
};