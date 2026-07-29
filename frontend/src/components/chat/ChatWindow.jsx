import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import { formatLastSeen, getInitials, stringToColor } from '../../utils/helpers';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatInfoPanel from './ChatInfoPanel';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { soundEffects } from '../../utils/soundEffects';

export default function ChatWindow({ onBack, socketRef }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?._id);
  const messages = useChatStore((s) => s.messages);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const chats = useChatStore((s) => s.chats);

  const [chat, setChat] = useState(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isFirstLoad = useRef(true);
  const headerRef = useRef(null);

  // ── Load chat ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    setLoadingChat(true);
    isFirstLoad.current = true;
    setPage(1);

    const tryLoad = async () => {
      let found = useChatStore.getState().chats.find((c) => c._id === chatId);
      if (!found) {
        try {
          const res = await api.get(`/chats/${chatId}`);
          found = res.data.chat;
          if (found) useChatStore.getState().addChat(found);
        } catch (_) {}
      }
      if (found) {
        setChat(found);
        useChatStore.getState().setActiveChat(found);
      }
      setLoadingChat(false);
    };

    tryLoad();
    useChatStore.getState().fetchMessages(chatId, 1).then((more) => setHasMore(more));
  }, [chatId]);

  // Sync chat from store updates
  useEffect(() => {
    if (!chatId) return;
    const found = chats.find((c) => c._id === chatId);
    if (found) setChat(found);
  }, [chats, chatId]); // eslint-disable-line

  // ── Scroll to BOTTOM (latest messages) on load & play sound for incoming ─────
  const msgCount = messages[chatId]?.length || 0;
  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (!msgCount) return;
    const chatMsgs = messages[chatId] || [];
    const latest = chatMsgs[chatMsgs.length - 1];

    if (msgCount > prevMsgCount.current && latest) {
      const isIncoming = (latest.sender?._id || latest.sender) !== userId;
      if (isIncoming) {
        soundEffects.playMessageSound();
      }
    }
    prevMsgCount.current = msgCount;

    if (isFirstLoad.current) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
      }, 30);
      isFirstLoad.current = false;
    } else {
      const container = scrollContainerRef.current;
      if (!container) return;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [msgCount, chatId, messages, userId]);

  // ── Fix keyboard pushing header off screen on mobile ──────────────────────
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewport = () => {
      const container = document.getElementById('chat-window-container');
      if (!container) return;
      const vh = window.visualViewport.height;
      const offsetTop = window.visualViewport.offsetTop;
      container.style.height = vh + 'px';
      container.style.position = 'fixed';
      container.style.top = offsetTop + 'px';
      container.style.left = '0';
      container.style.right = '0';
      container.style.bottom = 'auto';

      // Scroll messages to bottom when keyboard opens
      setTimeout(() => {
        const msgs = scrollContainerRef.current;
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
      }, 100);
    };

    // Set initial size
    handleViewport();

    window.visualViewport.addEventListener('resize', handleViewport);
    window.visualViewport.addEventListener('scroll', handleViewport);

    return () => {
      const container = document.getElementById('chat-window-container');
      if (container) {
        container.style.position = '';
        container.style.height = '';
        container.style.top = '';
      }
      window.visualViewport.removeEventListener('resize', handleViewport);
      window.visualViewport.removeEventListener('scroll', handleViewport);
    };
  }, []);

  // ── Join socket room ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !chatId) return;
    socket.emit('join_chat', chatId);
    return () => socket.emit('leave_chat', chatId);
  }, [chatId]); // eslint-disable-line

  // ── Load older messages on scroll ─────────────────────────────────────────
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Show scroll button when not near bottom
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distFromBottom > 200);

    if (!hasMore || isLoadingMore) return;
    if (container.scrollTop < 80) {
      setIsLoadingMore(true);
      const prevHeight = container.scrollHeight;
      const nextPage = page + 1;
      const more = await useChatStore.getState().fetchMessages(chatId, nextPage);
      setHasMore(more);
      setPage(nextPage);
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prevHeight;
      });
      setIsLoadingMore(false);
    }
  }, [chatId, hasMore, isLoadingMore, page]);

  const chatMessages = messages[chatId] || [];
  const typing = typingUsers[chatId] || {};
  const typingNames = Object.values(typing);
  const otherUser = !chat?.isGroup ? chat?.participants?.find((p) => p._id !== userId) : null;

  const getChatName = () => {
    if (!chat) return '';
    return chat.isGroup ? chat.name : (otherUser?.displayName || 'Unknown');
  };

  const getSubtitle = () => {
    if (!chat) return '';
    if (typingNames.length > 0) {
      return (
        <span className="flex items-center gap-1 text-brand-400 text-xs font-medium">
          {typingNames.join(', ')} typing
          <span className="flex gap-0.5 ml-1">
            {[0,1,2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
          </span>
        </span>
      );
    }
    if (chat.isGroup) return `${chat.participants?.length || 0} members`;
    return formatLastSeen(otherUser?.lastSeen, otherUser?.isOnline);
  };

  const initiateCall = (type) => {
    window.dispatchEvent(new CustomEvent('start_call', {
      detail: { targetUser: otherUser, callType: type, chatId },
    }));
  };

  const handleRequest = async (action) => {
    try {
      const res = await api.put(`/chats/${chatId}/request`, { action });
      if (res.data.chat) {
        useChatStore.getState().addChat(res.data.chat); // Re-add or update
        setChat(res.data.chat);
        if (action === 'accept') toast.success('Request accepted');
      }
    } catch (err) {
      toast.error('Failed to process request');
    }
  };

  if (loadingChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-[var(--text-muted)]">
        <p className="text-lg mb-2">Chat not found</p>
        <button onClick={() => { onBack?.(); navigate('/'); }} className="btn-ghost text-sm">← Go back</button>
      </div>
    );
  }

  const avatarSrc = chat.isGroup ? chat.avatar : otherUser?.avatar;
  const avatarName = getChatName();

  return (
    <div
      id="chat-window-container"
      className="flex-1 flex min-h-0 relative w-full chat-bg"
    >
      <div className="flex flex-col w-full relative" style={{ height: '100%' }}>

        {/* ── Header — always on top, sticky ── */}
        <div
          ref={headerRef}
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0 z-20 sticky top-0 sm:top-4 sm:mx-4 sm:rounded-3xl glass border border-[var(--border)] shadow-md animate-scale-in"
        >
          <button
            onClick={() => { onBack?.(); navigate('/'); }}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center text-white text-sm font-semibold"
                style={{ background: avatarSrc ? undefined : stringToColor(chat._id) }}>
                {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : getInitials(avatarName)}
              </div>
              {otherUser?.isOnline && !chat.isGroup && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[var(--text)] truncate">{getChatName()}</p>
              <div className="text-xs text-[var(--text-muted)] truncate">{getSubtitle()}</div>
            </div>
          </button>

          <div className="flex items-center gap-1">
            {!chat.isGroup && (
              <>
                <button onClick={() => initiateCall('audio')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-brand-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button onClick={() => initiateCall('video')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-brand-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </>
            )}
            <button onClick={() => setSearchMode(!searchMode)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${searchMode ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-[var(--surface-2)] text-[var(--text-muted)]'}`}
              title="Search Chat">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Disappearing Timer Button */}
            <button onClick={() => setShowDisappearingModal(true)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${chat.disappearingTimer > 0 ? 'text-amber-400 bg-amber-500/20' : 'hover:bg-[var(--surface-2)] text-[var(--text-muted)]'}`}
              title="Disappearing Messages">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sticky Pinned Message Banner */}
        {chatMessages.find((m) => m.isPinned) && (
          <div className="mx-4 mt-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between z-10 animate-slide-up">
            <div className="flex items-center gap-2 text-xs text-amber-300 min-w-0">
              <svg className="w-4 h-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="font-bold uppercase tracking-wider text-[10px]">Pinned:</span>
              <span className="truncate">{chatMessages.find((m) => m.isPinned)?.content || 'Pinned Attachment'}</span>
            </div>
            <button onClick={() => {
              const pinnedId = chatMessages.find((m) => m.isPinned)?._id;
              if (pinnedId) {
                document.getElementById(`msg-${pinnedId}`)?.scrollIntoView({ behavior: 'smooth' });
              }
            }} className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg hover:bg-amber-500/30 transition-colors">
              Jump
            </button>
          </div>
        )}

        {/* ── Messages — scrollable middle ── */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2 relative z-0"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            overscrollBehavior: 'contain',
          }}
        >
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-[var(--text-muted)]">
              <div className="text-5xl mb-4">👋</div>
              <p className="font-semibold text-[var(--text)]">Say hello to {getChatName()}!</p>
              <p className="text-sm mt-1">Send your first message below.</p>
            </div>
          )}
          {chatMessages.map((msg, idx) => {
            const prev = chatMessages[idx - 1];
            const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
            return (
              <React.Fragment key={msg._id}>
                {showDate && (
                  <div className="flex items-center justify-center my-4">
                    <span className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] text-xs px-3 py-1 rounded-full">
                      {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={msg.sender?._id === userId || msg.sender === userId}
                  showAvatar={chat.isGroup && msg.sender?._id !== userId}
                  isGroup={chat.isGroup}
                  chatId={chatId}
                />
              </React.Fragment>
            );
          })}

          {/* Animated typing bubble */}
          {typingNames.length > 0 && (
            <div className="flex items-center gap-2 mb-2 animate-fade-in">
              <div className="bubble-in px-3.5 py-2 flex items-center gap-1.5 rounded-2xl shadow-sm">
                <span className="text-xs text-[var(--text-muted)] font-medium mr-1">{typingNames[0]} is typing</span>
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Anchor to scroll to bottom */}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* ── Scroll to bottom button ── */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 z-20 w-9 h-9 bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-md flex items-center justify-center text-[var(--text-muted)] hover:text-brand-500 hover:border-brand-400 transition-all animate-fade-in"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* ── Input — always at bottom ── */}
        <div className="flex-shrink-0">
          {chat.status === 'pending' && chat.createdBy !== userId ? (
            <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)] text-center">
              <p className="text-sm text-[var(--text)] font-semibold mb-3">Accept message request from {getChatName()}?</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => handleRequest('decline')} className="px-6 py-2 rounded-xl text-sm font-semibold bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition-colors">Decline</button>
                <button onClick={() => handleRequest('accept')} className="px-6 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-glow">Accept</button>
              </div>
            </div>
          ) : chat.status === 'declined' ? (
            <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border)] text-center text-[var(--text-muted)] text-sm font-medium">
              You cannot reply to this conversation.
            </div>
          ) : (
            <MessageInput
              chatId={chatId}
              socketRef={socketRef}
              searchMode={searchMode}
              onCloseSearch={() => setSearchMode(false)}
            />
          )}
        </div>

      </div>

      {showInfo && <ChatInfoPanel chat={chat} otherUser={otherUser} onClose={() => setShowInfo(false)} />}

      {/* Disappearing Messages Modal */}
      {showDisappearingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[var(--text)]">Disappearing Messages</h3>
              <button onClick={() => setShowDisappearingModal(false)} className="w-8 h-8 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center">✕</button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">When enabled, new messages sent in this chat will auto-delete for everyone after the chosen timer.</p>
            <div className="space-y-2">
              {[
                { duration: 0, label: 'Off', desc: 'Messages remain permanently' },
                { duration: 3600, label: '1 Hour', desc: 'Auto-delete after 60 minutes' },
                { duration: 86400, label: '24 Hours', desc: 'Auto-delete after 1 day' },
                { duration: 604800, label: '7 Days', desc: 'Auto-delete after 1 week' },
              ].map((item) => (
                <button key={item.duration} onClick={async () => {
                  try {
                    await api.put(`/chats/${chatId}/disappearing`, { duration: item.duration });
                    setChat((prev) => ({ ...prev, disappearingTimer: item.duration }));
                    setShowDisappearingModal(false);
                    toast.success(`Disappearing timer set to ${item.label}`);
                  } catch (_) { toast.error('Failed to set timer'); }
                }}
                  className={`w-full text-left p-3 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all gesture-press ${chat.disappearingTimer === item.duration ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'}`}>
                  <div>
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-normal">{item.desc}</p>
                  </div>
                  {chat.disappearingTimer === item.duration && <span className="text-amber-400">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}