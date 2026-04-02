/**
 * ChatList — Scrollable conversation list with search
 */
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import { formatChatTime, getInitials, stringToColor } from '../../utils/helpers';
import NewChatModal from './NewChatModal';

export default function ChatList({ onSelect }) {
  const { chats, isLoadingChats } = useChatStore((s) => ({ chats: s.chats, isLoadingChats: s.isLoadingChats }));
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { chatId: activeChatId } = useParams();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'requests'

  const filtered = useMemo(() => {
    if (!user?._id) return [];
    
    let list = chats.filter((c) => c.status !== 'declined');
    if (activeTab === 'chats') {
      list = list.filter(c => c.status !== 'pending' || c.createdBy === user._id);
    } else {
      list = list.filter(c => c.status === 'pending' && c.createdBy !== user._id);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => {
      if (c.isGroup) return c.name?.toLowerCase().includes(q);
      const other = c.participants?.find((p) => p._id !== user._id);
      return other?.displayName?.toLowerCase().includes(q);
    });
  }, [chats, search, user?._id, activeTab]);

  const handleSelect = (chat) => {
    if (!chat?._id) return;
    useChatStore.getState().setActiveChat(chat);
    if (onSelect) {
      onSelect(chat);
    } else {
      navigate(`/chat/${chat._id}`);
    }
  };

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.name;
    const other = chat.participants?.find((p) => p._id !== user?._id);
    return other?.displayName || 'Unknown';
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return null;
    const other = chat.participants?.find((p) => p._id !== user?._id);
    return other?.avatar;
  };

  const getChatOnline = (chat) => {
    if (chat.isGroup) return false;
    const other = chat.participants?.find((p) => p._id !== user?._id);
    return other?.isOnline;
  };

  const getLastMessagePreview = (chat) => {
    const msg = chat.lastMessage;
    if (!msg) return 'No messages yet';
    if (msg.deletedForEveryone) return '🚫 Message deleted';
    if (msg.type === 'image') return '📷 Photo';
    if (msg.type === 'video') return '🎥 Video';
    if (msg.type === 'audio') return '🎵 Voice message';
    if (msg.type === 'document') return '📄 Document';
    if (msg.type === 'call') return msg.content || '📞 Call';
    // Don't show encrypted placeholder — show generic preview instead
    if (!msg.content || msg.content === '🔒 Encrypted message') return '💬 Message';
    return msg.content || '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-[var(--text)]">Messages</h1>
        <button
          onClick={() => setShowNewChat(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" className="input-field pl-9 py-2.5 text-sm"
            placeholder="Search conversations…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2 flex gap-4 border-b border-[var(--border)]">
        <button 
          className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'chats' ? 'border-brand-500 text-brand-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`} 
          onClick={() => setActiveTab('chats')}>
          Chats
        </button>
        <button 
          className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'requests' ? 'border-brand-500 text-brand-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`} 
          onClick={() => setActiveTab('requests')}>
          Requests
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        {isLoadingChats ? (
          <div className="flex flex-col gap-3 px-4 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[var(--surface-2)] rounded-full w-1/2" />
                  <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-medium">{search ? 'No conversations found' : 'No conversations yet'}</p>
            {!search && (
              <button onClick={() => setShowNewChat(true)} className="mt-3 text-brand-500 text-sm font-semibold">
                Start a new chat →
              </button>
            )}
          </div>
        ) : (
          filtered.map((chat) => {
            const name = getChatName(chat);
            const avatar = getChatAvatar(chat);
            const isOnline = getChatOnline(chat);
            const isActive = activeChatId === chat._id;
            const preview = getLastMessagePreview(chat);
            const isMine = user?._id && (chat.lastMessage?.sender?._id === user._id || chat.lastMessage?.sender === user._id);

            return (
              <button key={chat._id} onClick={() => handleSelect(chat)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-[var(--surface-2)] text-left ${isActive ? 'bg-[var(--surface-2)] border-r-2 border-brand-500' : ''}`}>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-white font-semibold text-sm"
                    style={{ background: avatar ? undefined : stringToColor(chat._id) }}>
                    {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
                  </div>
                  {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`font-semibold text-sm truncate ${isActive ? 'text-brand-600' : 'text-[var(--text)]'}`}>{name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 ml-1">
                      {chat.lastMessage ? formatChatTime(chat.lastMessage.createdAt || chat.updatedAt) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {isMine && <span className="text-brand-400 mr-1">You:</span>}
                      {preview}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}