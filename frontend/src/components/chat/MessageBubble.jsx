import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useChatStore from '../../store/chatStore';
import { formatMessageTime, formatFileSize, getInitials, stringToColor } from '../../utils/helpers';
import { decryptAnyMessage, initSodium, getOrCreateKeyPair, isE2EEncrypted } from '../../utils/encryption';
import MediaViewer from '../ui/MediaViewer';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const _cache = {};

export default function MessageBubble({ message, isOwn, showAvatar, isGroup, chatId }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [displayContent, setDisplayContent] = useState(null);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (message.deletedForEveryone) {
      setDisplayContent('');
      return;
    }

    // Use cache
    if (_cache[message._id]) {
      setDisplayContent(_cache[message._id]);
      return;
    }

    // Not encrypted — show directly
    if (!isE2EEncrypted(message)) {
      const text = message.content || '';
      _cache[message._id] = text;
      setDisplayContent(text);
      return;
    }

    // Encrypted — decrypt
    console.log('🔓 Decrypting message:', message._id);
    console.log('  e2e data:', JSON.stringify(message.e2e, null, 2));

    initSodium().then(async () => {
      try {
        // Show our own key for debug
        const { publicKey: ourKey } = await getOrCreateKeyPair();
        console.log('  Our public key:', ourKey.slice(0, 16) + '...');

        if (message.e2e?.isGroup) {
          console.log('  encryptedKeysList:', message.e2e?.encryptedKeysList?.map(e => e.publicKey.slice(0,16)));
          console.log('  Our key in list?', message.e2e?.encryptedKeysList?.some(e => e.publicKey === ourKey));
        }

        const text = await decryptAnyMessage(message);
        console.log('✅ Decrypted:', text);
        _cache[message._id] = text;
        setDisplayContent(text);
      } catch (err) {
        console.error('❌ Decrypt failed:', err.message);
        setDisplayContent('[🔒 Decryption failed: ' + err.message + ']');
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
    try { await api.post(`/messages/${message._id}/react`, { emoji }); } catch (_) {}
    setShowReactions(false); setShowActions(false);
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

        <div className={`${isOwn ? 'bubble-out' : 'bubble-in'} ${message.type === 'image' ? 'p-1.5' : ''}`}>
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