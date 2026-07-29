/**
 * Chat Controller
 * Create, get, and manage chat conversations
 */

const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

// ─── Get All Chats for Current User ──────────────────────────────────────────
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'displayName avatar isOnline lastSeen statusMessage')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'displayName' },
      })
      .lean();

    // Attach unread count per chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chat: chat._id,
          sender: { $ne: req.user._id },
          'readBy.user': { $ne: req.user._id },
          deletedForEveryone: false,
          deletedFor: { $ne: req.user._id },
        });
        return { ...chat, unreadCount };
      })
    );

    res.json({ success: true, chats: chatsWithUnread });
  } catch (err) {
    console.error('Get chats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chats.' });
  }
};

// ─── Get or Create 1-to-1 Chat ────────────────────────────────────────────────
exports.getOrCreateDirectChat = async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Find existing direct chat between these two users
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate('participants', 'displayName avatar isOnline lastSeen statusMessage')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'displayName' },
      });

    if (!chat) {
      const Friend = require('../models/Friend');
      const isFriend = await Friend.findOne({
        $or: [
          { requester: req.user._id, recipient: userId, status: 'accepted' },
          { requester: userId, recipient: req.user._id, status: 'accepted' },
        ],
      });

      // Create new direct chat
      chat = await Chat.create({
        isGroup: false,
        participants: [req.user._id, userId],
        createdBy: req.user._id,
        status: isFriend ? 'accepted' : 'pending',
      });
      await chat.populate('participants', 'displayName avatar isOnline lastSeen statusMessage');
    }

    res.json({ success: true, chat });
  } catch (err) {
    console.error('Get/create direct chat error:', err);
    res.status(500).json({ success: false, message: 'Failed to get or create chat.' });
  }
};

// ─── Create Group Chat ────────────────────────────────────────────────────────
exports.createGroupChat = async (req, res) => {
  try {
    const { name, participantIds, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Group name is required (min 2 chars).' });
    }

    if (!participantIds || participantIds.length < 1) {
      return res.status(400).json({ success: false, message: 'Group needs at least 1 other member.' });
    }

    const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];

    const chat = await Chat.create({
      isGroup: true,
      name: name.trim(),
      description: description?.trim(),
      participants: allParticipants,
      admins: [req.user._id],
      createdBy: req.user._id,
    });

    await chat.populate('participants', 'displayName avatar isOnline lastSeen');

    // Notify all participants
    const io = req.app.get('io');
    allParticipants.forEach((pid) => {
      io.to(`user:${pid}`).emit('chat_created', { chat });
    });

    res.status(201).json({ success: true, chat });
  } catch (err) {
    console.error('Create group chat error:', err);
    res.status(500).json({ success: false, message: 'Failed to create group.' });
  }
};

// ─── Get Single Chat ──────────────────────────────────────────────────────────
exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id,
    })
      .populate('participants', 'displayName avatar isOnline lastSeen statusMessage')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'displayName' },
      });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat.' });
  }
};

// ─── Add Participants to Group ────────────────────────────────────────────────
exports.addParticipants = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userIds } = req.body;

    const chat = await Chat.findOne({ _id: chatId, isGroup: true, admins: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const newParticipants = userIds.filter(
      (id) => !chat.participants.map((p) => p.toString()).includes(id)
    );
    chat.participants.push(...newParticipants);
    await chat.save();
    await chat.populate('participants', 'displayName avatar isOnline lastSeen');

    const io = req.app.get('io');
    chat.participants.forEach((p) => {
      io.to(`user:${p._id}`).emit('participants_added', { chatId, chat });
    });

    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add participants.' });
  }
};

// ─── Leave Group ──────────────────────────────────────────────────────────────
exports.leaveGroup = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, isGroup: true, participants: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    chat.participants = chat.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );
    chat.admins = chat.admins.filter((a) => a.toString() !== req.user._id.toString());

    // If no admins left, promote first participant
    if (chat.admins.length === 0 && chat.participants.length > 0) {
      chat.admins.push(chat.participants[0]);
    }

    await chat.save();
    res.json({ success: true, message: 'Left group successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to leave group.' });
  }
};

// ─── Accept Chat Request ──────────────────────────────────────────────────────
exports.acceptChatRequest = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id, isGroup: false });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    if (action === 'accept') {
      chat.status = 'accepted';
      await chat.save();
      
      const io = req.app.get('io');
      chat.participants.forEach((p) => {
        io.to(`user:${p}`).emit('chat_accepted', { chatId });
      });

      res.json({ success: true, chat });
    } else if (action === 'decline') {
      chat.status = 'declined';
      await chat.save();
      res.json({ success: true, chat });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
};

// ─── Set Disappearing Messages Timer ─────────────────────────────────────────
exports.setDisappearingTimer = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { duration } = req.body; // 0, 3600, 86400, 604800

    const chat = await Chat.findByIdAndUpdate(chatId, { disappearingTimer: duration }, { new: true });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    const io = req.app.get('io');
    io.to(`chat:${chatId}`).emit('disappearing_timer_updated', { chatId, duration });

    res.json({ success: true, disappearingTimer: chat.disappearingTimer });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to set disappearing timer.' });
  }
};

// ─── Set Chat Wallpaper ───────────────────────────────────────────────────────
exports.setWallpaper = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { wallpaper } = req.body;

    const chat = await Chat.findByIdAndUpdate(chatId, { wallpaper }, { new: true });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    res.json({ success: true, wallpaper: chat.wallpaper });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to set wallpaper.' });
  }
};