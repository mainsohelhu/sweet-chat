/**
 * ContactsPanel — Browse contacts, search users, add/remove
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useChatStore from '../../store/chatStore';
import { getInitials, stringToColor, formatLastSeen } from '../../utils/helpers';

export default function ContactsPanel({ onSelect }) {
  const navigate = useNavigate();
  const addChat = useChatStore((s) => s.addChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('contacts'); // 'contacts' | 'search'

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/users/me/contacts');
      setContacts(res.data.contacts);
    } catch (_) {}
  };

  const searchUsers = useCallback(async (q) => {
    if (q.trim().length < 2) return setSearchResults([]);
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.users);
    } catch (_) {}
    setLoading(false);
  }, []);

  const handleQuery = (e) => {
    setQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setTab('search');
      searchUsers(e.target.value);
    } else {
      setTab('contacts');
      setSearchResults([]);
    }
  };

  const addContact = async (userId) => {
    try {
      await api.post(`/users/contacts/${userId}`);
      await fetchContacts();
      toast.success('Contact added');
    } catch (_) { toast.error('Failed to add contact'); }
  };

  const removeContact = async (userId) => {
    try {
      await api.delete(`/users/contacts/${userId}`);
      setContacts((prev) => prev.filter((c) => c._id !== userId));
      toast.success('Contact removed');
    } catch (_) {}
  };

  const openChat = async (userId) => {
    try {
      const res = await api.get(`/chats/direct/${userId}`);
      const chat = res.data.chat;
      addChat(chat);
      setActiveChat(chat);
      navigate(`/chat/${chat._id}`);
      onSelect?.();
    } catch (_) { toast.error('Could not open chat'); }
  };

  const UserRow = ({ user, isContact }) => (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors group">
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center text-white font-semibold"
          style={{ background: user.avatar ? undefined : stringToColor(user._id) }}>
          {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(user.displayName)}
        </div>
        {user.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[var(--text)] truncate">{user.displayName}</p>
        <p className="text-xs text-[var(--text-muted)]">{formatLastSeen(user.lastSeen, user.isOnline)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => openChat(user._id)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors" title="Message">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        {isContact ? (
          <button onClick={() => removeContact(user._id)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--text-muted)] hover:text-red-500 transition-colors" title="Remove">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </button>
        ) : (
          <button onClick={() => addContact(user._id)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/20 text-[var(--text-muted)] hover:text-brand-500 transition-colors" title="Add contact">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-xl font-bold text-[var(--text)] mb-3">Contacts</h1>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" className="input-field pl-9 py-2.5 text-sm" placeholder="Search people…"
            value={query} onChange={handleQuery} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'search' && (
          <>
            {loading && <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>}
            {!loading && searchResults.length === 0 && query.length >= 2 && (
              <p className="text-center text-sm text-[var(--text-muted)] py-8">No users found for "{query}"</p>
            )}
            {searchResults.map((u) => <UserRow key={u._id} user={u} isContact={contacts.some((c) => c._id === u._id)} />)}
          </>
        )}

        {tab === 'contacts' && (
          <>
            {contacts.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm font-medium">No contacts yet</p>
                <p className="text-xs mt-1">Search for people above to add them</p>
              </div>
            ) : (
              contacts.map((u) => <UserRow key={u._id} user={u} isContact />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
