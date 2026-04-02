import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const BG_COLORS = [
  '#4f46e5','#7c3aed','#db2777','#dc2626',
  '#ea580c','#16a34a','#0891b2','#1d4ed8',
  '#000000','#374151','#92400e','#065f46',
];

const FONT_SIZES = ['text-xl', 'text-2xl', 'text-3xl'];

export default function CreateStory({ onClose }) {
  const [stories, setStories] = useState([
    { type: 'text', text: '', bgColor: '#4f46e5', mediaFile: null, mediaPreview: null, mediaType: null }
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [posting, setPosting] = useState(false);
  const [fontSize, setFontSize] = useState(1);
  const fileRef = useRef(null);

  const current = stories[activeIdx];

  const updateCurrent = (updates) => {
    setStories(prev => prev.map((s, i) => i === activeIdx ? { ...s, ...updates } : s));
  };

  const addStory = () => {
    setStories(prev => [...prev, { type: 'text', text: '', bgColor: '#4f46e5', mediaFile: null, mediaPreview: null, mediaType: null }]);
    setActiveIdx(stories.length);
  };

  const removeStory = (idx) => {
    if (stories.length === 1) return;
    setStories(prev => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, activeIdx - 1));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    updateCurrent({
      type: isVideo ? 'video' : 'image',
      mediaFile: file,
      mediaPreview: URL.createObjectURL(file),
      mediaType: isVideo ? 'video' : 'image',
    });
  };

  const handlePost = async () => {
    // Validate all
    for (let i = 0; i < stories.length; i++) {
      const s = stories[i];
      if (s.type === 'text' && !s.text.trim()) {
        toast.error(`Story ${i + 1}: write something or add a photo/video`);
        setActiveIdx(i);
        return;
      }
    }
    setPosting(true);
    try {
      for (const s of stories) {
        let mediaUrl = null;
        if (s.mediaFile) {
          const fd = new FormData();
          fd.append('file', s.mediaFile);
          const r = await api.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          mediaUrl = r.data.url;
        }
        await api.post('/stories', {
          type: s.type,
          content: s.text,
          mediaUrl,
          bgColor: s.bgColor,
        });
      }
      toast.success(`${stories.length} ${stories.length === 1 ? 'story' : 'stories'} posted! 🎉`);
      onClose();
    } catch (_) {
      toast.error('Failed to post some stories');
    }
    setPosting(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="font-display font-bold text-lg text-[var(--text)]">Create Stories</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Story tabs */}
        {stories.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-[var(--border)] flex-shrink-0">
            {stories.map((s, i) => (
              <div key={i} className={`relative flex-shrink-0`}>
                <button onClick={() => setActiveIdx(i)}
                  className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${activeIdx === i ? 'border-brand-500' : 'border-transparent'}`}
                  style={{ background: s.type === 'text' ? s.bgColor : '#000' }}>
                  {s.type !== 'text' && s.mediaPreview
                    ? <img src={s.mediaPreview} alt="" className="w-full h-full object-cover" />
                    : <span className="text-white text-xs font-bold">{i + 1}</span>
                  }
                </button>
                {stories.length > 1 && (
                  <button onClick={() => removeStory(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center text-[8px] font-bold">✕</button>
                )}
              </div>
            ))}
            <button onClick={addStory}
              className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-brand-500 hover:border-brand-400 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {[
              { id: 'text', label: '✏️ Text' },
              { id: 'image', label: '📷 Photo' },
              { id: 'video', label: '🎥 Video' },
            ].map(t => (
              <button key={t.id}
                onClick={() => { updateCurrent({ type: t.id }); if (t.id !== 'text') fileRef.current?.click(); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${current.type === t.id ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Preview box */}
          <div className="rounded-2xl overflow-hidden relative" style={{ height: 220, background: current.type === 'text' ? current.bgColor : '#111' }}>
            {current.type === 'text' && (
              <div className="w-full h-full flex items-center justify-center p-6">
                <p className={`text-white font-bold text-center leading-relaxed ${FONT_SIZES[fontSize]}`}>
                  {current.text || 'What\'s on your mind?'}
                </p>
              </div>
            )}
            {current.type === 'image' && current.mediaPreview && (
              <img src={current.mediaPreview} alt="" className="w-full h-full object-contain" />
            )}
            {current.type === 'video' && current.mediaPreview && (
              <video src={current.mediaPreview} className="w-full h-full object-contain" />
            )}
            {(current.type === 'image' || current.type === 'video') && !current.mediaPreview && (
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-3">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">Tap to select {current.type}</span>
              </button>
            )}
            {/* Change media button */}
            {(current.type === 'image' || current.type === 'video') && current.mediaPreview && (
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-xl">
                Change
              </button>
            )}
          </div>

          {/* Text input */}
          {current.type === 'text' && (
            <div className="space-y-2">
              <textarea
                className="input-field resize-none text-sm"
                rows={3}
                placeholder="Write your story... (max 200 chars)"
                value={current.text}
                onChange={(e) => updateCurrent({ text: e.target.value })}
                maxLength={200}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">{current.text.length}/200</span>
                {/* Font size */}
                <div className="flex gap-1">
                  {['A', 'A', 'A'].map((_, i) => (
                    <button key={i} onClick={() => setFontSize(i)}
                      className={`px-2 py-1 rounded-lg text-sm font-bold transition-all ${fontSize === i ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}
                      style={{ fontSize: 10 + i * 3 }}>A</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Background colors */}
          {current.type === 'text' && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2">Background</p>
              <div className="flex gap-2 flex-wrap">
                {BG_COLORS.map(c => (
                  <button key={c} onClick={() => updateCurrent({ bgColor: c })}
                    className={`w-8 h-8 rounded-xl border-2 transition-all ${current.bgColor === c ? 'border-white scale-110 ring-2 ring-brand-400' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          )}

          <input ref={fileRef} type="file"
            accept={current.type === 'video' ? 'video/*' : 'image/*'}
            className="hidden" onChange={handleFile} />

          {/* Add another story button */}
          {stories.length === 1 && (
            <button onClick={addStory}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-brand-500 hover:border-brand-400 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add another story
            </button>
          )}

          <button onClick={handlePost} disabled={posting}
            className="btn-primary w-full h-12 flex items-center justify-center gap-2">
            {posting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {posting ? 'Posting...' : `Post ${stories.length > 1 ? stories.length + ' Stories' : 'Story'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}