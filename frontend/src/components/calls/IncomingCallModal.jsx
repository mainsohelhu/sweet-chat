/**
 * IncomingCallModal — Shows incoming call with accept/reject
 */

import React, { useState, useEffect, useRef } from 'react';
import { getInitials, stringToColor } from '../../utils/helpers';

export function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState(null);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    const handler = ({ detail }) => {
      setIncomingCall(detail);
      // Play ringtone
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.1;
        osc.start(); setTimeout(() => osc.stop(), 3000);
        ringtoneRef.current = { stop: () => osc.stop() };
      } catch (_) {}
    };
    window.addEventListener('incoming_call', handler);
    return () => window.removeEventListener('incoming_call', handler);
  }, []);

  // Auto-dismiss after 30s (missed)
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => setIncomingCall(null), 30000);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  const accept = () => {
    ringtoneRef.current?.stop();
    window.dispatchEvent(new CustomEvent('accept_incoming_call', { detail: incomingCall }));
    setIncomingCall(null);
  };

  const reject = () => {
    ringtoneRef.current?.stop();
    window.dispatchEvent(new CustomEvent('reject_incoming_call', { detail: incomingCall }));
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const { from, callType } = incomingCall;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-card-dark p-5 flex items-center gap-4 min-w-72">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: from.avatar ? undefined : stringToColor(from._id) }}>
          {from.avatar ? <img src={from.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(from.displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--text)] truncate">{from.displayName}</p>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
            {callType === 'video' ? '📹 Incoming video call' : '📞 Incoming voice call'}
          </p>
          {/* Animated dots */}
          <div className="flex gap-1 mt-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce-subtle"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={reject}
            className="w-11 h-11 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
          <button onClick={accept}
            className="w-11 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm animate-bounce-subtle">
            {callType === 'video' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
