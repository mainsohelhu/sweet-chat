// components/chat/EmptyState.jsx
import React from 'react';

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-center p-8 hidden sm:flex">
      <div
        className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6 shadow-glow"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
      >
        <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      </div>
      <h2 className="font-display text-2xl font-bold text-[var(--text)] mb-2">Welcome to Sweetchat</h2>
      <p className="text-[var(--text-muted)] text-sm max-w-xs leading-relaxed">
        Select a conversation from the left or start a new chat to begin messaging.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        End-to-end encrypted · Secure by default
      </div>
    </div>
  );
}
