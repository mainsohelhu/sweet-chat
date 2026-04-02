/**
 * Sidebar — Icon navigation strip (leftmost panel)
 */

import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getInitials, stringToColor } from '../../utils/helpers';

const NavIcon = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    title={label}
    className={`
      relative w-10 h-10 flex items-center justify-center rounded-2xl
      transition-all duration-150 group
      ${active
        ? 'bg-brand-600 text-white shadow-glow-sm'
        : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
      }
    `}
  >
    {icon}
    {badge > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

export default function Sidebar({ active, onChange }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    import('../../utils/api').then(({ default: api }) => {
      api.get('/notifications').then(res => {
        setNotifCount(res.data.unreadCount || 0);
      }).catch(() => {});
    });
    const handler = (e) => {
      if (e.detail?.increment) setNotifCount(p => p + 1);
      if (e.detail?.reset) setNotifCount(0);
    };
    window.addEventListener('sw_notif_badge', handler);
    return () => window.removeEventListener('sw_notif_badge', handler);
  }, []);
  
  return (
    <div className="hidden sm:flex w-16 flex-shrink-0 flex-col items-center py-4 gap-2 border-r border-[var(--border)] glass z-10 shadow-lg">
      {/* Logo */}
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-3 shadow-glow-sm">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>

      {/* Main nav */}
      <NavIcon label="Chats" active={active === 'chats'} onClick={() => onChange('chats')}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'chats' ? 2.5 : 1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} />

      <NavIcon label="Friends" active={active === 'friends'} onClick={() => onChange('friends')}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'friends' ? 2.5 : 1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>} />

      <NavIcon label="Feed" active={active === 'feed'} onClick={() => onChange('feed')}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'feed' ? 2.5 : 1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />

      <NavIcon label="Contacts" active={active === 'contacts'} onClick={() => onChange('contacts')}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'contacts' ? 2.5 : 1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />

      <NavIcon label="Notifications" active={active === 'notifications'} onClick={() => { onChange('notifications'); setNotifCount(0); window.dispatchEvent(new CustomEvent('sw_notif_badge', { detail: { reset: true } })); }}
        badge={notifCount}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'notifications' ? 2.5 : 1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} />

      {/* Spacer */}
      {/* Spacer */}
      <div className="flex-1" />

      {/* Avatar */}
      <button
        onClick={() => onChange('profile')}
        className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-[var(--border)] hover:border-brand-500 transition-all"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: stringToColor(user?._id || '') }}
          >
            {getInitials(user?.displayName)}
          </div>
        )}
      </button>

      {/* Logout */}
      <NavIcon
        label="Logout"
        onClick={logout}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        }
      />
    </div>
  );
}