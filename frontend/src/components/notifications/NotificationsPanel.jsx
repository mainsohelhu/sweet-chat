import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { getInitials, stringToColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  friend_request:  '👋',
  friend_accepted: '🤝',
  post_like:       '❤️',
  post_comment:    '💬',
  post_share:      '🔗',
  story_reaction:  '😮',
  story_message:   '📩',
  new_message:     '✉️',
  mention:         '🔔',
};

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

function groupByDate(notifs) {
  const groups = {};
  notifs.forEach(n => {
    const d = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    const handler = (e) => {
      setNotifications(prev => [e.detail.notification, ...prev]);
    };
    window.addEventListener('sw_notification', handler);
    return () => window.removeEventListener('sw_notification', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (_) {}
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (_) {}
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (_) {}
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (_) {}
  };

  const handleFriendRequest = async (e, requestId, action, notifId) => {
    e.stopPropagation();
    try {
      await api.put(`/friends/request/${requestId}`, { action });
      toast.success(action === 'accept' ? 'Friend request accepted' : 'Friend request declined');
      // Mark this notification as read
      markRead(notifId);
    } catch (_) {
      toast.error('Failed to respond to request');
    }
  };

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : filter === 'requests'
    ? notifications.filter(n => n.type === 'friend_request')
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;
  const groups = groupByDate(filtered);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-[var(--text)]">Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge text-[10px]">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors whitespace-nowrap">
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll}
                className="text-xs text-[var(--text-muted)] hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread${unreadCount > 0 ? ` · ${unreadCount}` : ''}` },
            { id: 'requests', label: 'Requests' },
          ].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                filter === t.id
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto pb-20 sm:pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--text)] border-t-transparent rounded-full animate-spin opacity-20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-[var(--text-muted)]">
            <div className="w-16 h-16 rounded-3xl bg-[var(--surface-2)] flex items-center justify-center text-2xl mb-4">🔔</div>
            <p className="font-semibold text-[var(--text)] mb-1">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-sm leading-relaxed">
              {filter === 'unread'
                ? 'You have no unread notifications'
                : 'Friend requests, likes, comments and more will show up here'}
            </p>
          </div>
        ) : (
          Object.entries(groups).map(([date, notifs]) => (
            <div key={date}>
              {/* Date header */}
              <div className="px-4 py-2">
                <p className="text-[11px] font-bold text-[var(--text-subtle)] uppercase tracking-widest">{date}</p>
              </div>

              {notifs.map(notif => (
                <button key={notif._id} onClick={() => markRead(notif._id)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 transition-colors text-left group relative border-b border-[var(--border)] last:border-b-0
                    ${!notif.read ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}>

                  {/* Unread indicator */}
                  {!notif.read && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--text)]" />
                  )}

                  {/* Avatar + type badge */}
                  <div className="relative flex-shrink-0 ml-1">
                    <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: notif.sender?.avatar ? undefined : stringToColor(notif.sender?._id || '') }}>
                      {notif.sender?.avatar
                        ? <img src={notif.sender.avatar} alt="" className="w-full h-full object-cover" />
                        : getInitials(notif.sender?.displayName || '?')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[11px] leading-none">
                      {TYPE_ICONS[notif.type] || '🔔'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug break-words ${
                      !notif.read ? 'font-semibold text-[var(--text)]' : 'font-normal text-[var(--text-muted)]'
                    }`}>
                      {notif.text}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)] mt-1 font-medium">{timeAgo(notif.createdAt)}</p>

                    {notif.type === 'friend_request' && !notif.read && (
                      <div className="flex gap-2 mt-3 mb-1">
                        <button onClick={(e) => handleFriendRequest(e, notif.refId, 'accept', notif._id)} className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">Accept</button>
                        <button onClick={(e) => handleFriendRequest(e, notif.refId, 'reject', notif._id)} className="px-4 py-1.5 bg-[var(--surface-[2])] hover:bg-red-50 hover:text-red-600 text-[var(--text-muted)] text-xs font-semibold rounded-lg transition-colors border border-[var(--border)]">Decline</button>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button onClick={(e) => deleteNotif(notif._id, e)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-red-500 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}