import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor } from '../../utils/helpers';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];
const DURATION = 5000;

export default function StoryViewer({ groups, groupIndex, onClose }) {
  const [gIdx, setGIdx] = useState(groupIndex || 0);
  const [sIdx, setSIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [liveStory, setLiveStory] = useState(null);
  const [showEngagement, setShowEngagement] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const group = groups[gIdx];
  const baseStory = group?.stories[sIdx];
  const story = liveStory || baseStory;
  const isOwn = group?.user._id === user?._id;

  useEffect(() => {
    setLiveStory(null);
    setShowEngagement(false);
  }, [gIdx, sIdx]);

  // Mark viewed + fetch fresh
  useEffect(() => {
    if (!baseStory) return;
    api.post(`/stories/${baseStory._id}/view`).catch(() => {});
    api.get(`/stories/single/${baseStory._id}`)
      .then(r => { if (r.data.story) setLiveStory(r.data.story); })
      .catch(() => {});
  }, [gIdx, sIdx]); // eslint-disable-line

  // Progress timer
  useEffect(() => {
    if (!story || paused) return;
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now() - (progress / 100) * DURATION;
    const tick = (now) => {
      const pct = Math.min(((now - startRef.current) / DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
      else goNext();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gIdx, sIdx, paused]); // eslint-disable-line

  const goNext = useCallback(() => {
    setProgress(0);
    if (sIdx < (group?.stories.length || 1) - 1) setSIdx(s => s + 1);
    else if (gIdx < (groups?.length || 1) - 1) { setGIdx(g => g + 1); setSIdx(0); }
    else onClose();
  }, [sIdx, gIdx, group, groups, onClose]);

  const goPrev = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
    if (sIdx > 0) setSIdx(s => s - 1);
    else if (gIdx > 0) { setGIdx(g => g - 1); setSIdx(0); }
  }, [sIdx, gIdx]);

  const handleReact = async (emoji) => {
    try {
      const res = await api.post(`/stories/${story._id}/react`, { emoji });
      setLiveStory(prev => ({ ...(prev || story), reactions: res.data.reactions }));
    } catch (err) {
      console.error('React error:', err.response?.data);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/stories/${story._id}/message`, { text: messageText });
      setLiveStory(prev => ({
        ...(prev || story),
        messages: [...((prev || story).messages || []), res.data.message],
      }));
      setMessageText('');
      setPaused(false);
    } catch (_) {}
    setSending(false);
  };

  const handleDelete = async () => {
    try { await api.delete(`/stories/${story._id}`); goNext(); } catch (_) {}
  };

  if (!story || !group) return null;

  // Aggregate
  const reactionCounts = {};
  (story.reactions || []).forEach(r => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });
  const myReaction = (story.reactions || []).find(r =>
    (r.user?._id || r.user)?.toString() === user?._id
  );

  const totalEngagement = (story.viewers?.length || 0) +
    (story.reactions?.length || 0) + (story.messages?.length || 0);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center">

      {/* Progress */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
        {group.stories.map((s, i) => (
          <div key={s._id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full"
              style={{ width: i < sIdx ? '100%' : i === sIdx ? `${progress}%` : '0%', transition: 'none' }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
            style={{ background: group.user.avatar ? undefined : stringToColor(group.user._id) }}>
            {group.user.avatar
              ? <img src={group.user.avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{getInitials(group.user.displayName)}</div>}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{group.user.displayName}</p>
            <p className="text-white/60 text-xs">
              {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' · '}{sIdx + 1}/{group.stories.length}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {isOwn && (
            <button onClick={handleDelete} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Story content */}
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: story.type === 'text' ? story.bgColor : '#000' }}>
        {story.type === 'image' && story.mediaUrl && (
          <img src={story.mediaUrl} alt="" className="w-full h-full object-contain" />
        )}
        {story.type === 'video' && story.mediaUrl && (
          <video src={story.mediaUrl} autoPlay playsInline className="w-full h-full object-contain" onEnded={goNext} />
        )}
        {story.type === 'text' && (
          <div className="flex items-center justify-center w-full h-full px-10">
            <p className="text-white text-3xl font-bold text-center leading-relaxed drop-shadow-lg">{story.content}</p>
          </div>
        )}
      </div>

      {/* Tap zones */}
      <button className="absolute left-0 top-16 w-1/3 h-3/5 z-10" onClick={goPrev} />
      <button className="absolute right-0 top-16 w-1/3 h-3/5 z-10" onClick={goNext} />

      {/* Bottom area */}
      <div className="absolute bottom-0 left-0 right-0 z-20">

        {/* ── OWNER VIEW ── */}
        {isOwn && (
          <>
            {/* Engagement toggle button */}
            <button
              onClick={() => { setShowEngagement(!showEngagement); setPaused(!showEngagement); }}
              className="mx-4 mb-3 flex items-center gap-3 bg-black/50 backdrop-blur-md rounded-2xl px-4 py-3 w-auto"
            >
              <div className="flex items-center gap-1.5 text-white">
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-medium">{story.viewers?.length || 0}</span>
              </div>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <div key={emoji} className="flex items-center gap-1">
                  <span className="text-lg leading-none">{emoji}</span>
                  <span className="text-white text-sm">{count}</span>
                </div>
              ))}
              {(story.messages?.length || 0) > 0 && (
                <div className="flex items-center gap-1.5 text-white">
                  <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-sm font-medium">{story.messages.length}</span>
                </div>
              )}
              <svg className={`w-4 h-4 text-white/50 ml-auto transition-transform ${showEngagement ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Engagement detail panel */}
            {showEngagement && (
              <div className="mx-4 mb-4 bg-black/70 backdrop-blur-md rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                {/* Reactions */}
                {(story.reactions || []).length > 0 && (
                  <div className="p-3 border-b border-white/10">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Reactions</p>
                    <div className="space-y-2">
                      {(story.reactions || []).map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
                            style={{ background: r.user?.avatar ? undefined : stringToColor(r.user?._id || '') }}>
                            {r.user?.avatar
                              ? <img src={r.user.avatar} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{getInitials(r.user?.displayName || '')}</div>}
                          </div>
                          <span className="text-white text-sm flex-1">{r.user?.displayName}</span>
                          <span className="text-xl">{r.emoji}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Messages */}
                {(story.messages || []).length > 0 && (
                  <div className="p-3">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Replies</p>
                    <div className="space-y-3">
                      {(story.messages || []).map((m, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
                            style={{ background: m.user?.avatar ? undefined : stringToColor(m.user?._id || '') }}>
                            {m.user?.avatar
                              ? <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{getInitials(m.user?.displayName || '')}</div>}
                          </div>
                          <div>
                            <p className="text-white/50 text-[10px] mb-0.5">{m.user?.displayName}</p>
                            <p className="text-white text-sm">{m.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {totalEngagement === 0 && (
                  <p className="text-white/30 text-sm text-center py-6">No views yet</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── VIEWER: reactions + reply ── */}
        {!isOwn && (
          <div className="px-4 pb-8 space-y-3">
            {/* Reaction row — always visible */}
            <div className="flex items-center justify-center gap-4">
              {QUICK_REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => handleReact(emoji)}
                  className={`text-3xl transition-all ${myReaction?.emoji === emoji
                    ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                    : 'opacity-70 hover:opacity-100 hover:scale-110 active:scale-125'
                  }`}>
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => { if (!messageText.trim()) setPaused(false); }}
                placeholder={`Reply to ${group.user.displayName}...`}
                className="flex-1 bg-white/15 backdrop-blur-sm text-white placeholder-white/40 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:bg-white/20 border border-white/20"
              />
              <button type="submit" disabled={sending || !messageText.trim()}
                className="w-12 h-12 flex items-center justify-center bg-brand-600 hover:bg-brand-700 rounded-2xl disabled:opacity-40 flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}