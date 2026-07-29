import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import api from '../../utils/api';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import useE2E from '../../hooks/useE2E';


const TYPING_DEBOUNCE = 1500;

export default function MessageInput({ chatId, socketRef, searchMode, onCloseSearch }) {
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const addMessage = useChatStore((s) => s.addMessage);
  const activeChat = useChatStore((s) => s.activeChat);
  const userId = useAuthStore((s) => s.user?._id);
  const theme = useThemeStore((s) => s.theme);
  const { encryptForBoth, encryptForGroup } = useE2E();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const handleCreatePoll = async () => {
    const validOpts = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOpts.length < 2) {
      return toast.error('Question and 2+ options required');
    }
    try {
      const pollData = {
        question: pollQuestion.trim(),
        options: validOpts.map((o) => ({ optionText: o.trim(), votes: [] })),
      };
      const res = await api.post('/messages', {
        chatId, content: `📊 Poll: ${pollQuestion.trim()}`, type: 'text', pollData,
      });
      addMessage(chatId, res.data.message);
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      toast.success('Poll created!');
    } catch (_) {
      toast.error('Failed to create poll');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const duration = recordingSecs;

        const formData = new FormData();
        formData.append('file', file);
        try {
          const uploaded = await api.post('/uploads/file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const res = await api.post('/messages', {
            chatId, content: '🎤 Voice note', type: 'audio',
            attachment: { url: uploaded.data.url, filename: 'Voice Note', mimetype: 'audio/webm', size: audioBlob.size, duration },
          });
          addMessage(chatId, res.data.message);
          toast.success('Voice note sent!');
        } catch (_) {
          toast.error('Failed to send voice note');
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSecs(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSecs((p) => p + 1);
      }, 1000);
    } catch (_) {
      toast.error('Microphone permission required');
    }
  };

  const stopRecording = () => {
    clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    }
    setIsRecording(false);
    setRecordingSecs(0);
  };

  useEffect(() => {
    if (!searchMode) inputRef.current?.focus();
    setShowEmoji(false);
    setAttachments([]);
    setText('');
  }, [chatId, searchMode]);

  const sendTypingStart = useCallback(() => {
    if (!isTyping && socketRef?.current) {
      socketRef.current.emit('typing_start', { chatId });
      setIsTyping(true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef?.current?.emit('typing_stop', { chatId });
      setIsTyping(false);
    }, TYPING_DEBOUNCE);
  }, [chatId, isTyping, socketRef]);

  const onDrop = useCallback((files) => {
    const newAtts = files.slice(0, 5).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      id: Math.random().toString(36).slice(2),
    }));
    setAttachments((prev) => [...prev, ...newAtts].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, noClick: true, noKeyboard: true,
    accept: { 'image/*': [], 'video/*': [], 'audio/*': [], 'application/pdf': [] },
    maxSize: 50 * 1024 * 1024,
  });

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    clearTimeout(typingTimerRef.current);
    socketRef?.current?.emit('typing_stop', { chatId });
    setIsTyping(false);

    const textToSend = trimmed;
    const filesToSend = [...attachments];
    setText('');
    setAttachments([]);
    setShowEmoji(false);

    if (textToSend) {
      try {
        let payload = { chatId, type: 'text' };

        // Encrypt the message
        if (activeChat?.isGroup) {
          const participantIds = activeChat.participants
            ?.map((p) => p._id || p)
            .filter((id) => id !== userId) || [];
          const encrypted = await encryptForGroup(textToSend, participantIds);
          payload = { ...payload, content: encrypted.content, e2e: encrypted.e2e };
        } else {
          // Encrypt for BOTH recipient AND sender (so sender can also read their own messages)
          const otherUser = activeChat?.participants?.find((p) => (p._id || p) !== userId);
          const otherUserId = otherUser?._id || otherUser;
          if (otherUserId) {
            const encrypted = await encryptForBoth(textToSend, otherUserId);
            payload = { ...payload, content: encrypted.content, e2e: encrypted.e2e };
          } else {
            payload = { ...payload, content: textToSend };
          }
        }

        const res = await api.post('/messages', payload);
        addMessage(chatId, res.data.message);
      } catch (err) {
        toast.error('Failed to send message');
        setText(textToSend);
      }
    }

    for (const att of filesToSend) {
      try {
        const formData = new FormData();
        formData.append('file', att.file);
        const uploaded = await api.post('/uploads/file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const type = att.file.type.startsWith('image/') ? 'image'
          : att.file.type.startsWith('video/') ? 'video'
          : att.file.type.startsWith('audio/') ? 'audio' : 'document';

        const res = await api.post('/messages', {
          chatId, content: '', type,
          attachment: { url: uploaded.data.url, filename: uploaded.data.filename, mimetype: uploaded.data.mimetype, size: uploaded.data.size },
        });
        addMessage(chatId, res.data.message);
      } catch (_) {
        toast.error(`Failed to send ${att.file.name}`);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim().length >= 2) {
      useChatStore.getState().searchMessages(chatId, e.target.value.trim());
    } else {
      useChatStore.getState().clearSearchResults();
    }
  };

  if (searchMode) {
    return (
      <div className="px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-center gap-3">
        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" className="flex-1 bg-transparent outline-none text-sm text-[var(--text)] placeholder-[var(--text-muted)]"
          placeholder="Search in this chat…" value={searchQuery} onChange={handleSearch} autoFocus />
        <button onClick={() => { onCloseSearch(); useChatStore.getState().clearSearchResults(); setSearchQuery(''); }}
          className="text-[var(--text-muted)] hover:text-[var(--text)]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={`mb-4 mx-4 rounded-3xl glass backdrop-blur-xl shadow-lg border border-[var(--border)] transition-colors ${isDragActive ? 'bg-brand-50/20 dark:bg-brand-900/20 border-brand-500' : ''}`}>
      <input {...getInputProps()} />
      {isDragActive && <div className="p-6 text-center text-brand-500 font-semibold">📎 Drop files to attach</div>}

      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 flex-wrap">
          {attachments.map((att) => (
            <div key={att.id} className="relative group">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                {att.preview
                  ? <img src={att.preview} alt="" className="w-full h-full object-cover" />
                  : <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.414 5.414V19a2 2 0 01-2 2z" />
                    </svg>
                }
              </div>
              <button onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2 text-red-400 animate-pulse">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <span>Recording... {Math.floor(recordingSecs / 60)}:{(recordingSecs % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={cancelRecording} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={stopRecording} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors">
                Send Note
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex-shrink-0">
              <button onClick={() => setShowEmoji(!showEmoji)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showEmoji ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-500' : 'hover:bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            <button onClick={open} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] flex-shrink-0" title="Attach file">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Group Poll Icon Button */}
            {activeChat?.isGroup && (
              <button onClick={() => setShowPollModal(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] flex-shrink-0" title="Create Poll">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            )}

            <textarea ref={inputRef} rows={1}
              className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all"
              placeholder="Type a message…"
              value={text} onChange={(e) => { setText(e.target.value); sendTypingStart(); }}
              onKeyDown={handleKeyDown}
              style={{ minHeight: 40, maxHeight: 120 }}
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />

            {!text.trim() && attachments.length === 0 ? (
              <button onClick={startRecording}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all flex-shrink-0 gesture-press"
                title="Record voice note">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            ) : (
              <button onClick={handleSend} disabled={!text.trim() && attachments.length === 0}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all flex-shrink-0 gesture-press">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* WhatsApp-Style Bottom Emoji Keyboard Drawer */}
      {showEmoji && (
        <div className="w-full border-t border-[var(--border)] pt-2 pb-2 px-2 flex justify-center bg-[var(--bg)]/90 backdrop-blur-md rounded-b-3xl overflow-hidden animate-slide-up">
          <Picker
            data={data}
            onEmojiSelect={(e) => { setText((p) => p + e.native); }}
            theme={theme === 'dark' ? 'dark' : 'light'}
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={9}
          />
        </div>
      )}

      {/* Group Poll Creator Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[var(--text)]">Create Group Poll</h3>
              <button onClick={() => setShowPollModal(false)} className="w-8 h-8 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center">✕</button>
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Question</label>
              <input className="input-field mt-1 text-sm font-medium" placeholder="Ask a question..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Options</label>
              {pollOptions.map((opt, idx) => (
                <input key={idx} className="input-field text-sm font-medium" placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => {
                  const updated = [...pollOptions];
                  updated[idx] = e.target.value;
                  setPollOptions(updated);
                }} />
              ))}
              {pollOptions.length < 6 && (
                <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-brand-400 font-semibold hover:underline">+ Add Option</button>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreatePoll} className="btn-primary flex-1 h-10 text-sm font-bold">Create Poll</button>
              <button onClick={() => setShowPollModal(false)} className="btn-ghost flex-1 h-10 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}