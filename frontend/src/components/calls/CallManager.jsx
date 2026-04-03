/**
 * CallManager — WebRTC peer connection logic (audio + video calls)
 * Works in tandem with IncomingCallModal for accept/reject UI.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import CallScreen from './CallScreen';

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export default function CallManager({ socketRef }) {
  const user = useAuthStore((s) => s.user);
  const [activeCall, setActiveCall] = useState(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueue = useRef([]);

  const cleanup = useCallback(() => {
    iceQueue.current = [];
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    setActiveCall(null);
  }, []);

  const getMedia = async (callType) => {
    try {
      if (!navigator.mediaDevices) {
         throw new Error("Mobile browsers block cameras over regular HTTP connections. You must launch the server with HTTPS enabled to test mobile calling!");
      }
      return await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
    } catch (err) {
      if (err.name === 'NotReadableError') {
        toast.error('Device in use. Are you testing in two tabs?');
      }
      throw err;
    }
  };

  // Initiate outgoing call
  useEffect(() => {
    const handler = async ({ detail }) => {
      const { targetUser, callType, chatId } = detail;
      if (!socketRef?.current) return toast.error('Not connected');
      try {
        const stream = await getMedia(callType);
        localStreamRef.current = stream;
        const peer = new SimplePeer({ initiator: true, trickle: true, stream, config: rtcConfig });
        peerRef.current = peer;
        const callId = `${user._id}-${Date.now()}`;
        peer.on('signal', (data) => {
          if (data.type === 'offer') {
            socketRef.current?.emit('call_initiate', { targetUserId: targetUser._id, callType, offer: data, chatId });
          } else {
            socketRef.current?.emit('ice_candidate', { targetUserId: targetUser._id, candidate: data, callId });
          }
        });
        peer.on('stream', (remoteStream) => {
          setActiveCall((p) => p ? { ...p, remoteStream } : null);
        });
        peer.on('connect', () => {
          setActiveCall((p) => p ? { ...p, status: 'connected', startTime: new Date() } : null);
        });
        peer.on('error', () => { toast.error('Call connection failed'); cleanup(); });
        setActiveCall({ peer, localStream: stream, remoteStream: null, callType, targetUser, chatId, callId, startTime: null, status: 'calling', audioMuted: false, videoOff: false, isInitiator: true });
      } catch (err) {
        toast.error(err.name === 'NotAllowedError' ? 'Camera/mic permission denied' : 'Could not start call');
      }
    };
    window.addEventListener('start_call', handler);
    return () => window.removeEventListener('start_call', handler);
  }, [socketRef, user._id, cleanup]);

  // Accept incoming call
  useEffect(() => {
    const handler = async ({ detail }) => {
      const { from, callType, offer, chatId, callId } = detail;
      try {
        const stream = await getMedia(callType);
        localStreamRef.current = stream;
        const peer = new SimplePeer({ initiator: false, trickle: true, stream, config: rtcConfig });
        peerRef.current = peer;
        peer.on('signal', (data) => {
          if (data.type === 'answer') {
            socketRef.current?.emit('call_answer', { targetUserId: from._id, answer: data, callId });
          } else {
            socketRef.current?.emit('ice_candidate', { targetUserId: from._id, candidate: data, callId });
          }
        });
        peer.signal(offer);
        while (iceQueue.current.length > 0) {
          try { peer.signal(iceQueue.current.shift()); } catch (_) {}
        }
        peer.on('stream', (remoteStream) => setActiveCall((p) => p ? { ...p, remoteStream } : null));
        peer.on('connect', () => setActiveCall((p) => p ? { ...p, status: 'connected', startTime: new Date() } : null));
        peer.on('error', cleanup);
        setActiveCall({ peer, localStream: stream, remoteStream: null, callType, targetUser: from, chatId, callId, startTime: new Date(), status: 'connected', audioMuted: false, videoOff: false, isInitiator: false });
      } catch (err) {
        toast.error(err.name === 'NotAllowedError' ? 'Camera permission denied' : `Call failed: ${err.message}`);
        console.error('Accept call Error:', err);
        socketRef.current?.emit('call_reject', { targetUserId: from._id, callId, reason: 'error' });
      }
    };
    window.addEventListener('accept_incoming_call', handler);
    return () => window.removeEventListener('accept_incoming_call', handler);
  }, [socketRef, cleanup]);

  // Reject incoming call
  useEffect(() => {
    const handler = ({ detail }) => {
      socketRef.current?.emit('call_reject', { targetUserId: detail.from._id, callId: detail.callId, reason: 'rejected' });
    };
    window.addEventListener('reject_incoming_call', handler);
    return () => window.removeEventListener('reject_incoming_call', handler);
  }, [socketRef]);

  // Remote answered
  useEffect(() => {
    const handler = ({ detail }) => {
      peerRef.current?.signal(detail.answer);
      setActiveCall((p) => p ? { ...p, status: 'connected', startTime: new Date() } : null);
    };
    window.addEventListener('call_answered', handler);
    return () => window.removeEventListener('call_answered', handler);
  }, []);

  // Remote rejected/ended
  useEffect(() => {
    const handler = ({ detail }) => {
      if (!activeCall) return;
      if (detail.reason === 'rejected') toast('📵 Call rejected');
      else toast('📞 Call ended');
      if (activeCall.chatId) {
        api.post('/calls/log', { chatId: activeCall.chatId, type: activeCall.callType, status: detail.reason === 'rejected' ? 'rejected' : 'missed', duration: 0 }).catch(() => {});
      }
      cleanup();
    };
    window.addEventListener('call_rejected', handler);
    window.addEventListener('call_ended', handler);
    return () => { window.removeEventListener('call_rejected', handler); window.removeEventListener('call_ended', handler); };
  }, [activeCall, cleanup]);

  // ICE candidates
  useEffect(() => {
    const handler = ({ detail }) => { 
      if (peerRef.current) {
        try { peerRef.current.signal(detail.candidate); } catch (err) { console.error('ICE signal error:', err); } 
      } else {
        iceQueue.current.push(detail.candidate);
      }
    };
    window.addEventListener('ice_candidate', handler);
    return () => window.removeEventListener('ice_candidate', handler);
  }, []);

  const hangUp = useCallback(() => {
    if (!activeCall) return;
    const duration = activeCall.startTime ? Math.floor((Date.now() - new Date(activeCall.startTime).getTime()) / 1000) : 0;
    socketRef.current?.emit('call_end', { targetUserId: activeCall.targetUser._id, callId: activeCall.callId, duration });
    if (activeCall.chatId) {
      api.post('/calls/log', { chatId: activeCall.chatId, type: activeCall.callType, status: activeCall.status === 'connected' ? 'ended' : 'missed', duration }).catch(() => {});
    }
    cleanup();
  }, [activeCall, socketRef, cleanup]);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setActiveCall((p) => p ? { ...p, audioMuted: !p.audioMuted } : null); }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setActiveCall((p) => p ? { ...p, videoOff: !p.videoOff } : null); }
  }, []);

  if (!activeCall) return null;
  return <CallScreen call={activeCall} onHangUp={hangUp} onToggleAudio={toggleAudio} onToggleVideo={toggleVideo} />;
}
