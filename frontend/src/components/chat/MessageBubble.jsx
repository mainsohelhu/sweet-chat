import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import { formatMessageTime, formatFileSize, getInitials, stringToColor } from '../../utils/helpers';
import { decryptAnyMessage, initSodium, isE2EEncrypted } from '../../utils/encryption';
import MediaViewer from '../ui/MediaViewer';

import { soundEffects } from '../../utils/soundEffects';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const _cache = {};

export default function MessageBubble({ message, isOwn, showAvatar, isGroup, chatId }) {
  const userId = useAuthStore((s) => s.user?._id);
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [displayContent, setDisplayContent] = useState(null);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (message.deletedForEveryone) {
      setDisplayContent('');
      return;
    }

    if (_cache[message._id]) {
      setDisplayContent(_cache[message._id]);
      return;
    }

    if (!isE2EEncrypted(message)) {
      const text = message.content || '';
      _cache[message._id] = text;
      setDisplayContent(text);
      return;
    }

    initSodium().then(async () => {
      try {
        const text = await decryptAnyMessage(message);
        _cache[message._id] = text;
        setDisplayContent(text);
      } catch (err) {
        const fallback = (message.content && message.content !== '🔒 Encrypted message') ? message.content : '🔒 Encrypted message';
        _cache[message._id] = fallback;
        setDisplayContent(fallback);
      }
    });
  }, [message._id, message.e2e]); // eslint-disable-line

  const handleDelete = async (forEveryone) => {
    try {
      await api.delete(`/messages/${message._id}`, { data: { forEveryone } });
      if (forEveryone) updateMessage(chatId, message._id, { deletedForEveryone: true, content: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Could not delete'); }
    setShowActions(false);
  };

  const handleReact = async (emoji) => {
    try {
      if (emoji === '❤️') {
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 800);
      }
      soundEffects.playReactionSound();
      await api.post(`/messages/${message._id}/react`, { emoji });
    } catch (_) {}
    setShowReactions(false); setShowActions(false);
  };

  const handlePin = async () => {
    try {
      await api.put(`/messages/${message._id}/pin`);
      toast.success(message.isPinned ? 'Message unpinned' : 'Message pinned');
    } catch (_) {
      toast.error('Failed to pin message');
    }
  };

  const handleStar = async () => {
    try {
      await api.post(`/messages/${message._id}/star`);
      toast.success('Starred status updated');
    } catch (_) {
      toast.error('Failed to star message');
    }
  };

  const ReadIcon = () => {
    if (!isOwn) return null;
    const isRead = message.readBy?.length > 0;
    const isDelivered = message.deliveredTo?.length > 0;

    // Single tick — sent but not delivered (recipient offline)
    if (!isDelivered && !isRead) {
      return (
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-white/40" viewBox="0 0 16 11" fill="currentColor">
          <path d="M11.071.619L4.286 7.405 1.214 4.333.143 5.404l4.143 4.143L12.143 1.69z"/>
        </svg>
      );
    }
    // Double tick — delivered (grey) or read (blue)
    return (
      <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isRead ? 'text-blue-400' : 'text-white/40'}`} viewBox="0 0 16 11" fill="currentColor">
        <path d="M11.071.619L4.286 7.405 1.214 4.333.143 5.404l4.143 4.143L12.143 1.69z"/>
        <path d="M14.857.619L8.071 7.405l-.857-.857-.857.857L8.071 9.214l7.786-7.786z"/>
      </svg>
    );
  };

  const isLoading = displayContent === null;

  return (
    <div
      className={`flex items-end gap-2 mb-1 animate-slide-up group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
      onTouchStart={() => { longPressTimer.current = setTimeout(() => setShowActions(true), 500); }}
      onTouchEnd={() => clearTimeout(longPressTimer.current)}
    >
      {showAvatar && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-1"
          style={{ background: stringToColor(message.sender?._id || '') }}>
          {message.sender?.avatar
            ? <img src={message.sender.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            : getInitials(message.sender?.displayName || '')}
        </div>
      )}

      <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {isGroup && !isOwn && (
          <span className="text-[10px] font-semibold mb-1 ml-1" style={{ color: stringToColor(message.sender?._id || '') }}>
            {message.sender?.displayName}
          </span>
        )}

        <div 
          className={`${isOwn ? 'bubble-out' : 'bubble-in'} ${message.type === 'image' ? 'p-1.5' : ''} relative cursor-pointer select-none gesture-press`}
          onDoubleClick={() => handleReact('❤️')}
        >
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <span className="text-4xl animate-heart-burst drop-shadow-lg">❤️</span>
            </div>
          )}
          {message.deletedForEveryone && <p className="text-sm italic opacity-60">🚫 This message was deleted</p>}

          {isLoading && !message.deletedForEveryone && (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Decrypting...
            </div>
          )}

          {!message.deletedForEveryone && !isLoading && message.type === 'text' && (
            <div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {displayContent}
              </p>
              <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-end'}`}>
                <span className={`text-[10px] whitespace-nowrap ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                  {formatMessageTime(message.createdAt)}
                </span>
                <ReadIcon />
              </div>
            </div>
          )}

          {!message.deletedForEveryone && message.type === 'image' && message.attachment?.url && (
            <div className="relative rounded-xl overflow-hidden -m-1 mb-1" style={{ maxWidth: 280 }}>
              <button
                onClick={() => setMediaViewer({ url: message.attachment.url, type: 'image' })}
                className="block w-full rounded-xl overflow-hidden"
              >
                <img
                  src={message.attachment.url}
                  alt={message.attachment.filename || 'Attachment'}
                  className="w-full object-cover rounded-xl hover:opacity-90 transition-opacity block"
                  style={{ maxHeight: 220 }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none' }} className="w-full h-32 bg-[var(--surface-2)] rounded-xl items-center justify-center text-[var(--text-muted)] text-xs flex-col gap-2">
                  <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Image unavailable</span>
                </div>
              </button>
              <a
                href={message.attachment.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-lg flex items-center justify-center transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          )}

          {!message.deletedForEveryone && message.type === 'video' && message.attachment?.url && (
            <div className="relative rounded-xl overflow-hidden -m-1 mb-1" style={{ maxWidth: 280 }}>
              <video
                src={message.attachment.url}
                className="w-full object-cover rounded-xl cursor-pointer hover:opacity-90"
                style={{ maxHeight: 200 }}
                onClick={() => setMediaViewer({ url: message.attachment.url, type: 'video' })}
              />
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl cursor-pointer"
                onClick={() => setMediaViewer({ url: message.attachment.url, type: 'video' })}
              >
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-brand-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {!message.deletedForEveryone && message.type === 'audio' && message.attachment?.url && (
            <audio controls src={message.attachment.url} className="h-8 max-w-xs" />
          )}

          {/* Interactive Poll Card */}
          {!message.deletedForEveryone && message.pollData?.question && (
            <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-2 min-w-[240px] shadow-sm my-1">
              <p className="font-bold text-sm text-[var(--text)]">📊 {message.pollData.question}</p>
              <div className="space-y-1.5">
                {message.pollData.options.map((opt, idx) => {
                  const totalVotes = message.pollData.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
                  const votesCount = opt.votes?.length || 0;
                  const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                  const hasVoted = opt.votes?.some((v) => (v._id || v).toString() === userId);

                  return (
                    <button key={idx} onClick={async () => {
                      try {
                        await api.post(`/messages/${message._id}/poll-vote`, { optionIndex: idx });
                      } catch (_) { toast.error('Vote failed'); }
                    }}
                      className={`w-full text-left p-2 rounded-xl border text-xs font-semibold relative overflow-hidden transition-all gesture-press ${hasVoted ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'}`}>
                      <div className="absolute left-0 top-0 bottom-0 bg-brand-500/20 transition-all duration-500" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between z-10">
                        <span>{opt.optionText}</span>
                        <span className="text-[10px] opacity-80">{pct}% ({votesCount})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!message.deletedForEveryone && message.type === 'document' && message.attachment?.url && (
            <a href={message.attachment.url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-3 p-2 rounded-xl hover:opacity-80 ${isOwn ? 'bg-white/10' : 'bg-[var(--surface-2)]'}`}>
              <div className="w-10 h-10 bg-brand-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.414 5.414V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{message.attachment.filename}</p>
                <p className="text-xs opacity-60">{formatFileSize(message.attachment.size)}</p>
              </div>
            </a>
          )}

          {message.type === 'call' && (
            <p className="text-sm">{message.callData?.type === 'video' ? '📹' : '📞'} {message.content}</p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'} ${message.type === 'text' ? 'hidden' : ''}`}>
            <span className={`text-[10px] whitespace-nowrap flex-shrink-0 ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
              {formatMessageTime(message.createdAt)}
            </span>
            <ReadIcon />
          </div>
        </div>

        {message.reactions?.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {}))
              .map(([emoji, count]) => (
                <button key={emoji} onClick={() => handleReact(emoji)}
                  className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-0.5 text-xs hover:bg-[var(--surface-2)]">
                  {emoji} <span className="text-[var(--text-muted)]">{count}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {showActions && !message.deletedForEveryone && (
        <div className={`flex items-center gap-1 self-center ${isOwn ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
          <button onClick={handlePin}
            title={message.isPinned ? 'Unpin' : 'Pin'}
            className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-colors ${message.isPinned ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button onClick={handleStar}
            title="Star message"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <div className="relative">
            <button onClick={() => setShowReactions(!showReactions)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showReactions && (
              <div className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-3 py-2 shadow-card z-10 animate-fade-in`}>
                {QUICK_REACTIONS.map((e) => <button key={e} onClick={() => handleReact(e)} className="text-xl hover:scale-125 transition-transform">{e}</button>)}
              </div>
            )}
          </div>
          {isOwn && (
            <div className="relative group/del">
              <button className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-[var(--text-muted)] shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <div className="absolute bottom-full mb-2 right-0 hidden group-hover/del:flex flex-col gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-card z-10 overflow-hidden min-w-[160px] animate-fade-in">
                <button onClick={() => handleDelete(false)} className="px-4 py-2.5 text-sm text-left hover:bg-[var(--surface-2)] text-[var(--text)]">Delete for me</button>
                <button onClick={() => handleDelete(true)} className="px-4 py-2.5 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">Delete for everyone</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mediaViewer && <MediaViewer url={mediaViewer.url} type={mediaViewer.type} onClose={() => setMediaViewer(null)} />}
    </div>
  );
}