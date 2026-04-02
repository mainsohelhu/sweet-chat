import { create } from 'zustand';
import api from '../utils/api';

const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typingUsers: {},
  isLoadingChats: false,
  isLoadingMessages: false,

  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const res = await api.get('/chats');
      set({ chats: res.data.chats || [], isLoadingChats: false });
    } catch {
      set({ isLoadingChats: false });
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat });
    if (chat) {
      set((s) => ({
        chats: s.chats.map((c) => c._id === chat._id ? { ...c, unreadCount: 0 } : c),
      }));
    }
  },

  fetchMessages: async (chatId, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const res = await api.get(`/messages/${chatId}?page=${page}&limit=50`);
      const msgs = res.data.messages || [];
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: page === 1 ? msgs : [...msgs, ...(s.messages[chatId] || [])],
        },
        isLoadingMessages: false,
      }));
      return res.data.hasMore || false;
    } catch {
      set({ isLoadingMessages: false });
      return false;
    }
  },

  addMessage: (chatId, message) => {
    set((s) => {
      const existing = s.messages[chatId] || [];
      if (existing.find((m) => m._id === message._id)) return s;
      const chats = s.chats.map((c) => {
        if (c._id !== chatId) return c;
        return {
          ...c,
          lastMessage: message,
          unreadCount: s.activeChat?._id === chatId ? 0 : (c.unreadCount || 0) + 1,
        };
      });
      const idx = chats.findIndex((c) => c._id === chatId);
      if (idx > 0) { const [c] = chats.splice(idx, 1); chats.unshift(c); }
      return { messages: { ...s.messages, [chatId]: [...existing, message] }, chats };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).map((m) => m._id === messageId ? { ...m, ...updates } : m),
      },
    }));
  },

  setTyping: (chatId, userId, displayName, isTyping) => {
    set((s) => {
      const t = { ...(s.typingUsers[chatId] || {}) };
      if (isTyping) t[userId] = displayName; else delete t[userId];
      return { typingUsers: { ...s.typingUsers, [chatId]: t } };
    });
  },

  setUserOnline: (userId, isOnline, lastSeen) => {
    set((s) => ({
      chats: s.chats.map((c) => ({
        ...c,
        participants: c.participants?.map((p) => p._id === userId ? { ...p, isOnline, lastSeen } : p),
      })),
    }));
  },

  addChat: (chat) => {
    set((s) => {
      if (s.chats.find((c) => c._id === chat._id)) return s;
      return { chats: [chat, ...s.chats] };
    });
  },

  searchMessages: async (chatId, query) => {
    try {
      const res = await api.get(`/messages/${chatId}/search?query=${encodeURIComponent(query)}`);
      set({ searchResults: res.data.messages || [] });
    } catch {}
  },

  clearSearchResults: () => set({ searchResults: [] }),
  searchResults: [],
}));

export default useChatStore;
