/**
 * NewChatModal — Search users to start a chat or create a group
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useChatStore from '../../store/chatStore';
import { getInitials, stringToColor } from '../../utils/helpers';

export default function NewChatModal({ onClose }) {
  const navigate = useNavigate();
  const addChat = useChatStore((s) => s.addChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const [tab, setTab] = useState('direct'); // 'direct' | 'group'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const searchUsers = useCallback(async (q) => {
    if (q.trim().length < 2) return setResults([]);
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.users);
    } catch (_) {}
    setLoading(false);
  }, []);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    searchUsers(e.target.value);
  };

  const handleDirectChat = async (user) => {
    setCreating(true);
    try {
      const res = await api.get(`/chats/direct/${user._id}`);
      const chat = res.data.chat;
      addChat(chat);
      setActiveChat(chat);
      navigate(`/chat/${chat._id}`);
      onClose();
    } catch (_) {
      toast.error('Could not open chat');
    }
    setCreating(false);
  };

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) return toast.error('Group name is required');
    if (selected.length < 1) return toast.error('Add at least 1 member');
    setCreating(true);
    try {
      const res = await api.post('/chats/group', {
        name: groupName.trim(),
        participantIds: selected.map((u) => u._id),
      });
      const chat = res.data.chat;
      addChat(chat);
      setActiveChat(chat);
      navigate(`/chat/${chat._id}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-card-dark border border-[var(--border)] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">New Conversation</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 mb-4">
          {['direct', 'group'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setResults([]); setQuery(''); setSelected([]); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                tab === t ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {t === 'direct' ? '💬 Direct' : '👥 Group'}
            </button>
          ))}
        </div>

        {/* Group name (group tab only) */}
        {tab === 'group' && (
          <div className="px-5 mb-3">
            <input
              type="text"
              className="input-field"
              placeholder="Group name…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        )}

        {/* Selected chips (group) */}
        {tab === 'group' && selected.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 mb-3">
            {selected.map((u) => (
              <span key={u._id} className="flex items-center gap-1.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium px-3 py-1.5 rounded-full">
                {u.displayName}
                <button onClick={() => toggleSelect(u)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="px-5 mb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="input-field pl-9 text-sm"
              placeholder="Search by name or email…"
              value={query}
              onChange={handleQueryChange}
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto px-5 pb-2">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="text-center text-sm text-[var(--text-muted)] py-6">No users found</p>
          )}
          {results.map((u) => {
            const isSelected = selected.find((s) => s._id === u._id);
            return (
              <button
                key={u._id}
                onClick={() => tab === 'direct' ? handleDirectChat(u) : toggleSelect(u)}
                disabled={creating}
                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl transition-all mb-1 ${
                  isSelected ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: u.avatar ? undefined : stringToColor(u._id) }}>
                  {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(u.displayName)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{u.displayName}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{u.email || u.phone}</p>
                </div>
                {isSelected && (
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {u.isOnline && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Group create button */}
        {tab === 'group' && (
          <div className="px-5 pb-5 pt-3">
            <button
              onClick={createGroup}
              disabled={creating || selected.length < 1 || !groupName.trim()}
              className="btn-primary w-full h-11 flex items-center justify-center gap-2"
            >
              {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {creating ? 'Creating…' : `Create Group${selected.length >= 1 ? ` (${selected.length + 1} members)` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}