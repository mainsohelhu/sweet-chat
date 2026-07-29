import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatMessageTime, getInitials, stringToColor } from '../../utils/helpers';
import useChatStore from '../../store/chatStore';

export default function StarredMessagesPanel() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStarred = async () => {
      setLoading(true);
      try {
        const res = await api.get('/messages/starred');
        setMessages(res.data.messages || []);
      } catch (_) {}
      setLoading(false);
    };
    fetchStarred();
  }, []);

  const handleJump = (msg) => {
    if (!msg.chat?._id) return;
    useChatStore.getState().setActiveChat(msg.chat);
    navigate(`/chat/${msg.chat._id}`);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)] tracking-tight">Starred Messages</h1>
          <p className="text-xs text-[var(--text-muted)]">Your bookmarked messages & media</p>
        </div>
        <span className="text-xl">⭐️</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
            <div className="text-4xl mb-2">⭐</div>
            <p className="font-bold text-[var(--text)]">No starred messages yet</p>
            <p className="text-xs mt-1 text-center">Tap the star button on any message to save it here!</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg._id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm hover:border-brand-500/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl overflow-hidden flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: msg.sender?.avatar ? undefined : stringToColor(msg.sender?._id || '') }}>
                  {msg.sender?.avatar ? <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(msg.sender?.displayName || '')}
                </div>
                <span className="font-semibold text-xs text-[var(--text)]">{msg.sender?.displayName}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{formatMessageTime(msg.createdAt)}</span>
            </div>

            <p className="text-sm text-[var(--text)] leading-relaxed">{msg.content || 'Attachment'}</p>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-[10px] font-semibold text-brand-400">
                {msg.chat?.isGroup ? `👥 ${msg.chat.name}` : '💬 Direct Message'}
              </span>
              <button onClick={() => handleJump(msg)}
                className="text-xs font-semibold bg-brand-600/20 text-brand-300 px-3 py-1 rounded-xl hover:bg-brand-600/30 transition-colors gesture-press">
                Jump to Chat
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
