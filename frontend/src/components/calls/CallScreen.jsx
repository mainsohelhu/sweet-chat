/**
 * CallScreen — Full-screen active call overlay
 */

import React, { useRef, useEffect, useState } from 'react';
import { getInitials, stringToColor } from '../../utils/helpers';

export default function CallScreen({ call, onHangUp, onToggleAudio, onToggleVideo, onScreenShare }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream;
    }
  }, [call.remoteStream]);

  // Call timer
  useEffect(() => {
    if (call.status !== 'connected') return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [call.status]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const { targetUser, callType, status, audioMuted, videoOff } = call;

  return (
    <div className="call-overlay animate-fade-in">
      {/* Remote video (background) */}
      {callType === 'video' && call.remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <>
          {call.remoteStream && <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />}
          <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 rounded-[2rem] overflow-hidden flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 ring-4 ring-white/20"
              style={{ background: targetUser.avatar ? undefined : stringToColor(targetUser._id) }}>
              {targetUser.avatar
                ? <img src={targetUser.avatar} alt="" className="w-full h-full object-cover" />
                : getInitials(targetUser.displayName)}
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">{targetUser.displayName}</h2>
            <p className="text-white/70 text-sm">
              {status === 'calling' ? 'Calling…' : status === 'connected' ? formatTime(elapsed) : 'Connecting…'}
            </p>
            {status === 'calling' && (
              <div className="flex justify-center gap-1 mt-3">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/60 animate-bounce-subtle" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

      {/* Local video (PiP) */}
      {callType === 'video' && call.localStream && (
        <div className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
          {videoOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Call status (top) */}
      {status === 'connected' && callType === 'video' && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">{formatTime(elapsed)}</span>
        </div>
      )}

      {/* Controls (bottom) */}
      <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-4">
        {/* Mute */}
        <button
          onClick={onToggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            audioMuted ? 'bg-white text-gray-900' : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={audioMuted ? 'Unmute' : 'Mute'}
        >
          {audioMuted ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Hang up */}
        <button
          onClick={onHangUp}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/40"
        >
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>

        {/* Toggle camera (video calls only) */}
        {callType === 'video' && (
          <>
            <button
              onClick={onToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                videoOff ? 'bg-white text-gray-900' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={videoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={onScreenShare}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-white/20 hover:bg-white/30 text-white gesture-press"
              title="Share Screen"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
