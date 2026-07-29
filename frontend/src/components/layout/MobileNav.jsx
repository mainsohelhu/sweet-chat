/**
 * MobileNav — Bottom navigation bar for mobile (replaces sidebar)
 */
import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor } from '../../utils/helpers';

export default function MobileNav({ active, onChange, showList }) {
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    import('../../utils/api').then(({ default: api }) => {
      api.get('/notifications').then(res => setNotifCount(res.data.unreadCount || 0)).catch(() => {});
    });
    const handler = (e) => {
      if (e.detail?.increment) setNotifCount(p => p + 1);
      if (e.detail?.reset) setNotifCount(0);
    };
    window.addEventListener('sw_notif_badge', handler);
    return () => window.removeEventListener('sw_notif_badge', handler);
  }, []);
  const user = useAuthStore((s) => s.user);

  return (
    <div className={`lg:hidden fixed bottom-3 left-3 right-3 z-50 rounded-3xl glass shadow-2xl border border-[var(--border)] flex items-center justify-around px-2 py-2.5 transition-transform duration-500 ease-out ${showList ? 'translate-y-0' : 'translate-y-[150%]'}`}>
      {/* Chats */}
      <button onClick={() => onChange('chats')}
        className={`flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-2xl transition-all gesture-press ${active === 'chats' ? 'bg-brand-600/20 text-brand-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
        <svg className="w-5 h-5" fill={active === 'chats' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-[10px] tracking-tight">Chats</span>
      </button>

      {/* Friends */}
      <button onClick={() => onChange('friends')}
        className={`flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-2xl transition-all gesture-press ${active === 'friends' ? 'bg-brand-600/20 text-brand-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
        <svg className="w-5 h-5" fill={active === 'friends' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="text-[10px] tracking-tight">Friends</span>
      </button>

      {/* Feed */}
      <button onClick={() => onChange('feed')}
        className={`flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-2xl transition-all gesture-press ${active === 'feed' ? 'bg-brand-600/20 text-brand-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
        <svg className="w-5 h-5" fill={active === 'feed' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-[10px] tracking-tight">Feed</span>
      </button>

      {/* Notifications */}
      <button onClick={() => { onChange('notifications'); setNotifCount(0); window.dispatchEvent(new CustomEvent('sw_notif_badge', { detail: { reset: true } })); }}
        className={`flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-2xl transition-all relative gesture-press ${active === 'notifications' ? 'bg-brand-600/20 text-brand-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
        <svg className="w-5 h-5" fill={active === 'notifications' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifCount > 0 && (
          <span className="absolute -top-1 right-2 min-w-[16px] h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
            {notifCount > 99 ? '99+' : notifCount}
          </span>
        )}
        <span className="text-[10px] tracking-tight">Alerts</span>
      </button>

      {/* Profile */}
      <button onClick={() => onChange('profile')}
        className={`flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-2xl transition-all gesture-press ${active === 'profile' ? 'bg-brand-600/20 text-brand-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
        <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-white text-[9px] font-bold ring-2 ${active === 'profile' ? 'ring-brand-500' : 'ring-transparent'}`}
          style={{ background: user?.avatar ? undefined : stringToColor(user?._id || '') }}>
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : getInitials(user?.displayName || '')}
        </div>
        <span className="text-[10px] tracking-tight">Profile</span>
      </button>
    </div>
  );
}