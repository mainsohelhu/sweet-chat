import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor } from '../../utils/helpers';

export default function CreatePost({ onCreated }) {
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [visibility, setVisibility] = useState('friends');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return toast.error('File too large (max 50MB)');
    const isVideo = file.type.startsWith('video/');
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaType(isVideo ? 'video' : 'image');
  };

  const handlePost = async () => {
    if (!caption.trim() && !mediaFile) return toast.error('Write something or add a photo/video');
    setPosting(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        const fd = new FormData();
        fd.append('file', mediaFile);
        const r = await api.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        mediaUrl = r.data.url;
      }
      const res = await api.post('/posts', { caption, mediaUrl, mediaType, visibility });
      setCaption(''); setMediaFile(null); setMediaPreview(null); setMediaType(null);
      onCreated?.(res.data.post);
      toast.success('Post shared!');
    } catch (_) { toast.error('Failed to post'); }
    setPosting(false);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
          style={{ background: user?.avatar ? undefined : stringToColor(user?._id || '') }}>
          {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(user?.displayName || '')}
        </div>
        <div className="flex-1">
          <textarea
            className="w-full bg-[var(--surface-2)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 border border-[var(--border)]"
            placeholder={`What's on your mind, ${user?.displayName?.split(' ')[0]}?`}
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
          />

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden">
              {mediaType === 'image'
                ? <img src={mediaPreview} alt="" className="w-full max-h-64 object-cover rounded-xl" />
                : <video src={mediaPreview} className="w-full max-h-64 rounded-xl" controls />
              }
              <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-brand-500 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo/Video
              </button>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
                className="text-xs bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none">
                <option value="friends">👥 Friends</option>
                <option value="everyone">🌍 Everyone</option>
              </select>
            </div>
            <button onClick={handlePost} disabled={posting || (!caption.trim() && !mediaFile)}
              className="btn-primary px-4 py-1.5 text-sm flex items-center gap-2 disabled:opacity-40">
              {posting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {posting ? 'Sharing...' : 'Share'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}