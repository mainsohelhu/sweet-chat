/**
 * Socket.io Event Handlers
 * Manages real-time messaging, presence, typing, and WebRTC signaling
 */

const { socketAuth } = require('../middleware/auth');
const User = require('../models/User');

// Map: userId -> Set of socketIds (multi-device support)
const onlineUsers = new Map();

module.exports = function initSocketHandlers(io) {
  // Apply auth middleware to all socket connections
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.displayName} (${socket.id})`);

    // ─── Presence ─────────────────────────────────────────────────────────────
    // Track online status (multi-device)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for targeted messages
    socket.join(`user:${userId}`);

    // Mark user online in DB
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // Broadcast online status to contacts
    socket.broadcast.emit('user_online', { userId, isOnline: true });

    // ─── Join Chat Rooms ──────────────────────────────────────────────────────
    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    // ─── Typing Indicators ────────────────────────────────────────────────────
    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        chatId,
        userId,
        displayName: socket.user.displayName,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        chatId,
        userId,
        displayName: socket.user.displayName,
        isTyping: false,
      });
    });

    // ─── Message Delivery Receipt ─────────────────────────────────────────────
    socket.on('message_delivered', ({ messageId, chatId }) => {
      io.to(`chat:${chatId}`).emit('delivery_receipt', {
        messageId,
        userId,
        deliveredAt: new Date(),
      });
    });

    // ─── WebRTC Signaling (Calls) ─────────────────────────────────────────────
    // Initiate a call
    socket.on('call_initiate', ({ targetUserId, callType, offer, chatId }) => {
      io.to(`user:${targetUserId}`).emit('incoming_call', {
        from: {
          _id: userId,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar,
        },
        callType,   // 'audio' | 'video'
        offer,      // WebRTC SDP offer
        chatId,
        callId: `${userId}-${Date.now()}`,
      });
    });

    // Accept a call
    socket.on('call_answer', ({ targetUserId, answer, callId }) => {
      io.to(`user:${targetUserId}`).emit('call_answered', { answer, callId });
    });

    // Reject a call
    socket.on('call_reject', ({ targetUserId, callId, reason = 'rejected' }) => {
      io.to(`user:${targetUserId}`).emit('call_rejected', { callId, reason });
    });

    // ICE candidates exchange
    socket.on('ice_candidate', ({ targetUserId, candidate, callId }) => {
      io.to(`user:${targetUserId}`).emit('ice_candidate', { candidate, callId, from: userId });
    });

    // End call
    socket.on('call_end', ({ targetUserId, callId, duration }) => {
      io.to(`user:${targetUserId}`).emit('call_ended', { callId, duration });
    });

    // ─── Group Call ───────────────────────────────────────────────────────────
    socket.on('join_call_room', ({ roomId }) => {
      socket.join(`call:${roomId}`);
      socket.to(`call:${roomId}`).emit('call_peer_joined', {
        userId,
        displayName: socket.user.displayName,
        avatar: socket.user.avatar,
      });
    });

    socket.on('leave_call_room', ({ roomId }) => {
      socket.to(`call:${roomId}`).emit('call_peer_left', { userId });
      socket.leave(`call:${roomId}`);
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${socket.user.displayName} (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          // All devices offline
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          socket.broadcast.emit('user_online', { userId, isOnline: false, lastSeen: new Date() });
        }
      }
    });

    // ─── Error Handling ───────────────────────────────────────────────────────
    socket.on('error', (err) => {
      console.error(`Socket error for ${socket.user.displayName}:`, err);
    });
  });
};
