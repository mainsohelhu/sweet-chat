import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { getInitials, stringToColor } from '../../utils/helpers';

const Avatar = ({ user }) => (
  <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
    style={{ background: user?.avatar ? undefined : stringToColor(user?._id || '') }}>
    {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(user?.displayName || '')}
  </div>
);

export default function FriendsPanel() {
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMap, setStatusMap] = useState({});

  const loadFriends = useCallback(async () => {
    try {
      const [fr, req, sug] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests'),
        api.get('/users/suggestions'),
      ]);
      setFriends(fr.data.friends || []);
      setReceived(req.data.received || []);
      setSent(req.data.sent || []);
      setSuggestions(sug.data.suggestions || []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const searchUsers = async (q) => {
    if (!q.trim()) return setSearchResults([]);
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${q}`);
      const users = res.data.users || [];
      const statuses = await Promise.all(users.map(u => api.get(`/friends/status/${u._id}`)));
      const map = {};
      users.forEach((u, i) => { map[u._id] = statuses[i].data; });
      setStatusMap(map);
      setSearchResults(users);
    } catch (_) {}
    setLoading(false);
  };

  const sendRequest = async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
      toast.success('Friend request sent! 👋');
      setStatusMap(prev => ({ ...prev, [userId]: { status: 'pending', isSender: true } }));
      setSuggestions(prev => prev.filter(u => u._id !== userId));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const respond = async (requestId, action) => {
    try {
      await api.put(`/friends/request/${requestId}`, { action });
      toast.success(action === 'accept' ? 'Now friends! 🎉' : 'Request declined');
      loadFriends();
    } catch (_) {}
  };

  const unfriend = async (userId) => {
    try { await api.delete(`/friends/${userId}`); toast.success('Removed'); loadFriends(); }
    catch (_) {}
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-xl font-bold text-[var(--text)]">Friends</h1>
      </div>
      <div className="flex gap-1 px-4 mb-3">
        {[{ id: 'friends', label: 'Friends', count: friends.length },
          { id: 'requests', label: 'Requests', count: received.length },
          { id: 'find', label: 'Find People' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all relative ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
            {t.label}
            {t.count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 sm:pb-4 space-y-2">

        {/* Friends Tab */}
        {tab === 'friends' && (
          friends.length === 0
            ? <div className="text-center py-12 text-[var(--text-muted)]"><div className="text-4xl mb-3">👥</div><p className="text-sm font-medium">No friends yet</p><button onClick={() => setTab('find')} className="mt-2 text-brand-500 text-sm font-semibold">Find people →</button></div>
            : friends.map(({ friendshipId, user }) => (
              <div key={friendshipId} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                <div className="relative"><Avatar user={user} />{user.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{user.displayName}</p>
                  {user.username && <p className="text-xs text-[var(--text-muted)]">@{user.username}</p>}
                </div>
                <button onClick={() => unfriend(user._id)} className="text-xs text-[var(--text-muted)] hover:text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">Remove</button>
              </div>
            ))
        )}

        {/* Requests Tab */}
        {tab === 'requests' && (<>
          {received.length === 0 && sent.length === 0 && suggestions.length === 0
            ? <div className="text-center py-12 text-[var(--text-muted)]"><div className="text-4xl mb-3">📭</div><p className="text-sm">No pending requests</p></div>
            : null}

          {received.length > 0 && <><p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-1">Received</p>
            {received.map(req => (
              <div key={req._id} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                <Avatar user={req.requester} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{req.requester?.displayName}</p>
                  <p className="text-xs text-[var(--text-muted)]">Wants to be friends</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(req._id, 'accept')} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl">Accept</button>
                  <button onClick={() => respond(req._id, 'reject')} className="px-3 py-1.5 bg-[var(--surface-2)] text-[var(--text-muted)] text-xs rounded-xl hover:text-red-500">Decline</button>
                </div>
              </div>
            ))}</>}

          {sent.length > 0 && <><p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-2 pb-1">Sent</p>
            {sent.map(req => (
              <div key={req._id} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                <Avatar user={req.recipient} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{req.recipient?.displayName}</p>
                  <p className="text-xs text-brand-400">Pending...</p>
                </div>
                <button onClick={() => { api.delete(`/friends/${req.recipient._id}`); loadFriends(); }} className="text-xs text-[var(--text-muted)] hover:text-red-500 px-3 py-1.5 rounded-xl">Cancel</button>
              </div>
            ))}</>}

          {/* Suggestions in requests tab */}
          {suggestions.length > 0 && (
            <><p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-2 pb-1">People You May Know</p>
            {suggestions.map(u => (
              <div key={u._id} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                <Avatar user={u} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{u.displayName}</p>
                  {u.username && <p className="text-xs text-[var(--text-muted)]">@{u.username}</p>}
                </div>
                <button onClick={() => sendRequest(u._id)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl">Add</button>
              </div>
            ))}</>
          )}
        </>)}

        {/* Find People Tab */}
        {tab === 'find' && (
          <>
            <input type="text" className="input-field text-sm" placeholder="Search by name or @username..."
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }} autoFocus />
            {loading && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>}

            {/* Search results */}
            {searchQuery && searchResults.map(u => {
              const s = statusMap[u._id] || { status: 'none' };
              return (
                <div key={u._id} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text)] truncate">{u.displayName}</p>
                    {u.username && <p className="text-xs text-[var(--text-muted)]">@{u.username}</p>}
                  </div>
                  {s.status === 'none' && <button onClick={() => sendRequest(u._id)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl">Add Friend</button>}
                  {s.status === 'pending' && s.isSender && <span className="text-xs text-[var(--text-muted)] px-3 py-1.5 bg-[var(--surface-2)] rounded-xl">Pending</span>}
                  {s.status === 'pending' && !s.isSender && <span className="text-xs text-brand-400 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-xl">Respond ↑</span>}
                  {s.status === 'accepted' && <span className="text-xs text-emerald-500 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">✓ Friends</span>}
                </div>
              );
            })}

            {/* Suggestions when no search */}
            {!searchQuery && suggestions.length > 0 && (
              <><p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-1">Suggested For You</p>
              {suggestions.map(u => (
                <div key={u._id} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text)] truncate">{u.displayName}</p>
                    {u.username ? <p className="text-xs text-[var(--text-muted)]">@{u.username}</p> : u.bio ? <p className="text-xs text-[var(--text-muted)] truncate">{u.bio}</p> : null}
                  </div>
                  <button onClick={() => sendRequest(u._id)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl">Add Friend</button>
                </div>
              ))}</>
            )}
          </>
        )}
      </div>
    </div>
  );
}