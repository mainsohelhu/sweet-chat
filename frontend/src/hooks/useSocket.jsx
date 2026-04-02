import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useChatStore from '../store/chatStore';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  

  useEffect(() => {
    // Read auth directly from localStorage — stable, no re-renders
    const getAuth = () => {
      try { return JSON.parse(localStorage.getItem('sc_auth') || '{}'); } catch { return {}; }
    };

    const { token, user } = getAuth();
    if (!token || !user) return; // Not logged in — don't connect

    // Already connected — don't reconnect
    if (socketRef.current?.connected) return;

    const getSocketUrl = () => {
      if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
      return window.location.origin; // socket.io client uses path '/socket.io' over standard proxy
    };

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      
      // Only reconnect if not intentional
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (e) => {
      console.warn('Socket error:', e.message);
    });

    socket.on('new_message', ({ message, chatId }) => {
      useChatStore.getState().addMessage(chatId, message);
      const active = useChatStore.getState().activeChat;
      const { user: u } = getAuth();
      if (active?._id !== chatId && message.sender?._id !== u?._id) {
        toast(`💬 ${message.sender?.displayName}: ${
          message.type === 'image' ? '📷 Photo' :
          message.type === 'video' ? '🎥 Video' :
          message.content || 'New message'
        }`, { duration: 3000 });
      }
    });

    socket.on('user_typing', ({ chatId, userId, displayName, isTyping }) => {
      const { user: u } = getAuth();
      if (userId !== u?._id) {
        useChatStore.getState().setTyping(chatId, userId, displayName, isTyping);
        if (isTyping) {
          setTimeout(() => useChatStore.getState().setTyping(chatId, userId, displayName, false), 5000);
        }
      }
    });

    socket.on('user_online', ({ userId, isOnline, lastSeen }) => {
      useChatStore.getState().setUserOnline(userId, isOnline, lastSeen);
    });

    socket.on('message_deleted', ({ messageId, chatId, forEveryone }) => {
      if (forEveryone) {
        useChatStore.getState().updateMessage(chatId, messageId, { deletedForEveryone: true, content: '' });
      }
    });

    socket.on('message_reaction', ({ messageId, reactions }) => {
      const active = useChatStore.getState().activeChat;
      if (active) useChatStore.getState().updateMessage(active._id, messageId, { reactions });
    });

    socket.on('chat_created', ({ chat }) => useChatStore.getState().addChat(chat));

    socket.on('notification', ({ notification }) => {
      // Dispatch to NotificationsPanel
      window.dispatchEvent(new CustomEvent('sw_notification', { detail: { notification } }));
      // Update unread count badge
      window.dispatchEvent(new CustomEvent('sw_notif_badge', { detail: { increment: true } }));
    });

    socket.on('messages_read', ({ chatId, userId: rid, messageIds }) => {
      messageIds.forEach((id) => {
        useChatStore.getState().updateMessage(chatId, id, { readBy: [{ user: rid, readAt: new Date() }] });
      });
    });

    socket.on('incoming_call', (d) => window.dispatchEvent(new CustomEvent('incoming_call', { detail: d })));
    socket.on('call_answered', (d) => window.dispatchEvent(new CustomEvent('call_answered', { detail: d })));
    socket.on('call_rejected', (d) => window.dispatchEvent(new CustomEvent('call_rejected', { detail: d })));
    socket.on('call_ended',    (d) => window.dispatchEvent(new CustomEvent('call_ended',    { detail: d })));
    socket.on('ice_candidate', (d) => window.dispatchEvent(new CustomEvent('ice_candidate',  { detail: d })));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      
    };
  }, []); // ← runs ONCE on mount only

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export default useSocket;