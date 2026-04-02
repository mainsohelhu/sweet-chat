import React from 'react';
import { getInitials, stringToColor, formatLastSeen } from '../../utils/helpers';

export default function ChatInfoPanel({ chat, otherUser, onClose }) {
  const name = chat.isGroup ? chat.name : otherUser?.displayName;
  const avatar = chat.isGroup ? chat.avatar : otherUser?.avatar;

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Panel — modal on mobile, side panel on desktop */}
      <div className="
        fixed inset-y-0 right-0 z-50 w-full max-w-sm
        sm:relative sm:inset-auto sm:z-auto sm:w-72
        bg-[var(--surface)] border-l border-[var(--border)]
        flex flex-col animate-slide-in-right
        shadow-card-dark sm:shadow-none
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h3 className="font-semibold text-[var(--text)]">
            {chat.isGroup ? 'Group Info' : 'Contact Info'}
          </h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar + name */}
          <div className="flex flex-col items-center py-8 px-4">
            <div className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold mb-3"
              style={{ background: avatar ? undefined : stringToColor(chat._id) }}>
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : getInitials(name || '')}
            </div>
            <h2 className="font-display font-bold text-lg text-[var(--text)] text-center">{name}</h2>
            {!chat.isGroup && otherUser && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {formatLastSeen(otherUser.lastSeen, otherUser.isOnline)}
              </p>
            )}
            {chat.isGroup && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {chat.participants?.length} members
              </p>
            )}
          </div>

          {/* Status */}
          {!chat.isGroup && otherUser?.statusMessage && (
            <div className="mx-4 mb-4 p-3 bg-[var(--surface-2)] rounded-2xl">
              <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">Status</p>
              <p className="text-sm text-[var(--text)]">{otherUser.statusMessage}</p>
            </div>
          )}

          {/* Contact info */}
          {!chat.isGroup && (
            <div className="mx-4 mb-4 space-y-2">
              {otherUser?.email && (
                <div className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-2xl">
                  <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-[var(--text)] truncate">{otherUser.email}</span>
                </div>
              )}
              {otherUser?.phone && (
                <div className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-2xl">
                  <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-[var(--text)]">{otherUser.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Group members */}
          {chat.isGroup && (
            <div className="mx-4 mb-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Members</p>
              <div className="space-y-2">
                {chat.participants?.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 p-2.5 bg-[var(--surface-2)] rounded-xl">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: p.avatar ? undefined : stringToColor(p._id) }}>
                      {p.avatar
                        ? <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                        : getInitials(p.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--text)] truncate">{p.displayName}</p>
                      {p.isOnline && <span className="text-[10px] text-emerald-400 font-medium">Online</span>}
                    </div>
                    {chat.admins?.includes(p._id) && (
                      <span className="text-[10px] bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-semibold">
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}