/**
 * Message Controller
 * Send, receive, delete, and search messages
 */

const xss = require('xss');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// ─── Send Message ─────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content, type = 'text', replyTo, e2e, attachment } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
    });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or access denied.' });
    }

    if (chat.status === 'pending' && chat.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You must accept the message request before replying.' });
    }

    const sanitizedContent = e2e ? (content || '🔒 Encrypted message') : xss(content || '');

    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content: sanitizedContent,
      type,
      replyTo: replyTo || null,
      e2e: e2e || undefined,
      attachment: attachment || undefined,
    });

    // Update chat's lastMessage and updatedAt
    chat.lastMessage = message._id;
    await chat.save();

    // Populate sender for the response
    await message.populate('sender', 'displayName avatar');
    if (replyTo) await message.populate('replyTo');

    // Emit to all participants via Socket.io
    const io = req.app.get('io');
    chat.participants.forEach((participantId) => {
      io.to(`user:${participantId}`).emit('new_message', {
        message,
        chatId,
      });
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

// ─── Get Messages ─────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
    });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('sender', 'displayName avatar')
      .populate('replyTo')
      .lean();

    // Mark messages as read
    const unreadIds = messages
      .filter((m) => !m.readBy?.some((r) => r.user.toString() === req.user._id.toString()))
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { readBy: { user: req.user._id, readAt: new Date() } } }
      );
      // Notify senders of read receipts
      const io = req.app.get('io');
      io.to(`chat:${chatId}`).emit('messages_read', {
        chatId,
        userId: req.user._id,
        messageIds: unreadIds,
      });
    }

    res.json({
      success: true,
      messages: messages.reverse(), // Oldest first
      hasMore: messages.length === parseInt(limit),
      page: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

// ─── Delete Message ───────────────────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { forEveryone = false } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (forEveryone) {
      // Only sender can delete for everyone (within 1 hour)
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Only the sender can delete for everyone.' });
      }
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return res.status(400).json({ success: false, message: 'Can only delete for everyone within 1 hour.' });
      }
      message.deletedForEveryone = true;
      message.content = '';
      message.encrypted = undefined;
      message.attachment = undefined;
      message.deletedAt = new Date();
    } else {
      // Delete only for this user
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
      }
    }

    await message.save();

    const io = req.app.get('io');
    io.to(`chat:${message.chat}`).emit('message_deleted', {
      messageId,
      chatId: message.chat,
      forEveryone,
      deletedBy: req.user._id,
    });

    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
};

// ─── Search Messages ──────────────────────────────────────────────────────────
exports.searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query too short.' });
    }

    // Verify access
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const messages = await Message.find({
      chat: chatId,
      content: { $regex: safeQuery, $options: 'i' },
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'displayName avatar')
      .lean();

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
};

// ─── Add Reaction ─────────────────────────────────────────────────────────────
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    // Remove existing reaction from this user, then add new
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );
    if (emoji) {
      message.reactions.push({ user: req.user._id, emoji });
    }
    await message.save();

    const io = req.app.get('io');
    io.to(`chat:${message.chat}`).emit('message_reaction', {
      messageId,
      reactions: message.reactions,
    });

    res.json({ success: true, reactions: message.reactions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add reaction.' });
  }
};

// ─── Pin / Unpin Message ──────────────────────────────────────────────────────
exports.togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    message.isPinned = !message.isPinned;
    await message.save();

    const io = req.app.get('io');
    io.to(`chat:${message.chat}`).emit('message_pinned', {
      messageId: message._id,
      chatId: message.chat,
      isPinned: message.isPinned,
      content: message.content,
    });

    res.json({ success: true, isPinned: message.isPinned, message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to pin message.' });
  }
};

// ─── Star / Unstar Message ────────────────────────────────────────────────────
exports.toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    const isStarred = message.starredBy?.some((u) => u.toString() === req.user._id.toString());
    if (isStarred) {
      message.starredBy = message.starredBy.filter((u) => u.toString() !== req.user._id.toString());
    } else {
      message.starredBy.push(req.user._id);
    }

    await message.save();
    res.json({ success: true, isStarred: !isStarred });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to star message.' });
  }
};

// ─── Vote on Poll ─────────────────────────────────────────────────────────────
exports.votePoll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body;

    const message = await Message.findById(messageId);
    if (!message || !message.pollData) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }

    const userId = req.user._id;
    // Toggle vote for the selected option
    message.pollData.options.forEach((opt, idx) => {
      opt.votes = opt.votes.filter((v) => v.toString() !== userId.toString());
      if (idx === optionIndex) {
        opt.votes.push(userId);
      }
    });

    await message.save();

    const io = req.app.get('io');
    io.to(`chat:${message.chat}`).emit('poll_voted', {
      messageId: message._id,
      pollData: message.pollData,
    });

    res.json({ success: true, pollData: message.pollData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cast vote.' });
  }
};

// ─── Get All Starred Messages for User ───────────────────────────────────────
exports.getStarredMessages = async (req, res) => {
  try {
    const messages = await Message.find({ starredBy: req.user._id, deletedForEveryone: { $ne: true } })
      .populate('sender', 'displayName avatar')
      .populate('chat', 'name isGroup avatar')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch starred messages.' });
  }
};