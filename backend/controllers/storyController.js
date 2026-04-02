const Story = require('../models/Story');
const { createNotification } = require('../utils/notify');
const Friend = require('../models/Friend');

// Helper — get friend IDs for a user
const getFriendIds = async (userId) => {
  const friends = await Friend.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  });
  return friends.map(f =>
    f.requester.toString() === userId.toString() ? f.recipient : f.requester
  );
};

// Get single story (for live updates)
exports.getSingleStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('user', 'displayName avatar')
      .populate('viewers.user', 'displayName avatar _id')
      .populate('reactions.user', 'displayName avatar _id')
      .populate('messages.user', 'displayName avatar _id');
    if (!story) return res.status(404).json({ success: false, message: 'Not found' });
    const viewed = story.viewers.some(v => v.user?._id?.toString() === req.user._id.toString());
    res.json({ success: true, story: { ...story.toObject(), viewed } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// Create story
exports.createStory = async (req, res) => {
  try {
    const { type, content, mediaUrl, bgColor } = req.body;
    const story = await Story.create({
      user: req.user._id,
      type: type || 'text',
      content,
      mediaUrl,
      bgColor: bgColor || '#4f46e5',
    });
    await story.populate('user', 'displayName avatar');

    // Notify friends via socket
    const friendIds = await getFriendIds(req.user._id);
    const io = req.app.get('io');
    friendIds.forEach(fid => {
      io.to(`user:${fid}`).emit('new_story', { story });
    });

    res.json({ success: true, story });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ success: false, message: 'Failed to create story' });
  }
};

// Get stories (own + friends, grouped by user)
exports.getStories = async (req, res) => {
  try {
    const friendIds = await getFriendIds(req.user._id);
    const allowedUserIds = [...friendIds, req.user._id];

    const stories = await Story.find({
      user: { $in: allowedUserIds },
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'displayName avatar')
      .populate('viewers.user', 'displayName avatar _id')
      .populate('reactions.user', 'displayName avatar _id')
      .populate('messages.user', 'displayName avatar _id')
      .sort({ createdAt: -1 });

    // Group by user, own stories first
    const grouped = {};
    stories.forEach(s => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: s.user, stories: [] };
      // Mark if current user has viewed it
      const viewed = s.viewers.some(v => v.user?._id?.toString() === req.user._id.toString());
      grouped[uid].stories.push({ ...s.toObject(), viewed });
    });

    // Put own stories first
    const myId = req.user._id.toString();
    const result = Object.values(grouped).sort((a, b) => {
      if (a.user._id.toString() === myId) return -1;
      if (b.user._id.toString() === myId) return 1;
      return 0;
    });

    res.json({ success: true, stories: result });
  } catch (err) {
    console.error('Get stories error:', err);
    res.status(500).json({ success: false, message: 'Failed to get stories' });
  }
};

// View story — prevent duplicate view counts
exports.viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    // Only add if not already viewed
    const alreadyViewed = story.viewers.some(
      v => v.user.toString() === req.user._id.toString()
    );
    if (!alreadyViewed) {
      story.viewers.push({ user: req.user._id });
      await story.save();
    }

    res.json({ success: true, viewCount: story.viewers.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// React to story
exports.reactToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: 'Emoji required' });

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Not found' });

    // Only friends or self can react
    const friendIds = await getFriendIds(story.user);
    const allowed = [...friendIds.map(id => id.toString()), story.user.toString()];
    if (!allowed.includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    // Remove old reaction from same user, add new one
    story.reactions = story.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    story.reactions.push({ user: req.user._id, emoji });
    await story.save();
    await story.populate('reactions.user', 'displayName avatar _id');

    // Notify story owner
    const io = req.app.get('io');
    await createNotification(io, {
      recipient: story.user,
      sender: req.user._id,
      type: 'story_reaction',
      refId: story._id,
      refModel: 'Story',
      text: `${req.user.displayName} reacted ${emoji} to your story`,
    });
    io.to(`user:${story.user}`).emit('story_reaction', {
      storyId, reactions: story.reactions, from: req.user.displayName, emoji,
    });

    res.json({ success: true, reactions: story.reactions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to react' });
  }
};

// Send message on story
exports.messageStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Not found' });

    // Only friends can message
    const friendIds = await getFriendIds(story.user);
    if (!friendIds.map(id => id.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Only friends can reply' });
    }

    story.messages.push({ user: req.user._id, text: text.trim() });
    await story.save();
    const newMsg = story.messages[story.messages.length - 1];
    await story.populate('messages.user', 'displayName avatar _id');
    const populated = story.messages.find(m => m._id.toString() === newMsg._id.toString());

    // Notify story owner
    const io = req.app.get('io');
    await createNotification(io, {
      recipient: story.user,
      sender: req.user._id,
      type: 'story_message',
      refId: story._id,
      refModel: 'Story',
      text: `${req.user.displayName} replied to your story: "${text.trim().slice(0,40)}"`,
    });
    io.to(`user:${story.user}`).emit('story_message', {
      storyId, message: populated, from: req.user.displayName,
    });

    res.json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Delete own story
exports.deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findOne({ _id: storyId, user: req.user._id });
    if (!story) return res.status(404).json({ success: false, message: 'Story not found or not yours' });
    await story.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete story error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
};