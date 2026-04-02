import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor, formatMessageTime } from '../../utils/helpers';
import UserProfileModal from './UserProfileModal';

export default function PostCard({ post: initialPost, onDelete, compact }) {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const user = useAuthStore((s) => s.user);

  const isOwn = post.user._id === user?._id || post.user === user?._id;
  const isLiked = post.likes?.includes(user?._id);
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const shareCount = post.shares?.length || 0;

  const handleLike = async () => {
    try {
      const res = await api.post(`/posts/${post._id}/like`);
      setPost(prev => ({
        ...prev,
        likes: res.data.liked
          ? [...(prev.likes || []), user._id]
          : (prev.likes || []).filter(id => id !== user._id),
      }));
    } catch (_) {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/posts/${post._id}/comment`, { text: commentText });
      setPost(prev => ({ ...prev, comments: [...(prev.comments || []), res.data.comment] }));
      setCommentText('');
      setShowComments(true);
    } catch (_) { toast.error('Failed to comment'); }
    setSending(false);
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/posts/${post._id}/comment/${commentId}`);
      setPost(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }));
    } catch (_) {}
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/posts/${post._id}`);
      onDelete?.(post._id);
      setShowDeleteConfirm(false);
    } catch (_) { toast.error('Failed to delete'); }
  };

  const handleArchive = async () => {
    try {
      const res = await api.put(`/posts/${post._id}/archive`);
      toast.success(res.data.archived ? 'Post archived' : 'Post unarchived');
      if (res.data.archived) onDelete?.(post._id);
    } catch (_) { toast.error('Failed'); }
    setShowMenu(false);
  };

  const handleShare = async () => {
    try {
      await api.post(`/posts/${post._id}/share`);
      toast.success('Post shared!');
      setPost(prev => ({ ...prev, shares: [...(prev.shares || []), { user: user._id }] }));
    } catch (_) {}
    setShowMenu(false);
  };

  const Avatar = ({ u, size = 10 }) => (
    <button onClick={() => setViewingUser(u?._id)} className={`w-${size} h-${size} rounded-xl overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0 hover:opacity-80 transition-opacity`}
      style={{ background: u?.avatar ? undefined : stringToColor(u?._id || ''), fontSize: size < 10 ? 10 : 13 }}>
      {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(u?.displayName || '')}
    </button>
  );

  const visibleComments = showAllComments ? post.comments : post.comments?.slice(-2);

  return (
    <>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar u={post.user} />
            <div>
              <button onClick={() => setViewingUser(post.user._id)} className="font-semibold text-sm text-[var(--text)] hover:text-brand-500 transition-colors text-left">
                {post.user.displayName}
              </button>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-[var(--text-muted)]">{formatMessageTime(post.createdAt)}</p>
                <span className="text-[var(--text-muted)] text-xs">·</span>
                <span className="text-[10px] text-[var(--text-muted)]">{post.visibility === 'everyone' ? '🌍' : '👥'}</span>
              </div>
            </div>
          </div>
          {/* Menu */}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-card z-10 overflow-hidden min-w-[160px] animate-fade-in">
                <button onClick={handleShare} className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--surface-2)] flex items-center gap-2 text-[var(--text)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share Post
                </button>
                {isOwn && <>
                  <button onClick={handleArchive} className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--surface-2)] flex items-center gap-2 text-[var(--text)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    Archive Post
                  </button>
                  <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete Post
                  </button>
                </>}
              </div>
            )}
          </div>
        </div>

        {/* Caption */}
        {post.caption && <p className="px-4 pb-3 text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{post.caption}</p>}

        {/* Media */}
        {post.mediaUrl && post.mediaType === 'image' && (
          <img src={post.mediaUrl} alt="" className="w-full max-h-[500px] object-contain bg-[var(--surface-2)]" />
        )}
        {post.mediaUrl && post.mediaType === 'video' && (
          <video src={post.mediaUrl} controls className="w-full max-h-[500px] object-contain bg-[var(--surface-2)]" />
        )}

        {/* Stats */}
        {(likeCount > 0 || commentCount > 0 || shareCount > 0) && (
          <div className="flex items-center justify-between px-4 py-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">{likeCount > 0 && <><span>❤️</span> {likeCount}</>}</span>
            <div className="flex items-center gap-3">
              {commentCount > 0 && <button onClick={() => setShowComments(!showComments)} className="hover:underline">{commentCount} comments</button>}
              {shareCount > 0 && <span>{shareCount} shares</span>}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!compact && (
          <div className="flex border-t border-[var(--border)] mx-4 mt-2">
            <button onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl transition-all duration-300 active:scale-90 ${isLiked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'}`}>
              <svg className={`w-5 h-5 transition-transform duration-300 ${isLiked ? 'scale-110 drop-shadow-md' : 'scale-100'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isLiked ? 2 : 1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isLiked ? 'Liked' : 'Like'}
            </button>
            <button onClick={() => setShowComments(!showComments)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[var(--text-muted)] hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 rounded-xl transition-colors active:scale-95">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Comment
            </button>
          </div>
        )}

        {/* Comments */}
        {showComments && !compact && (
          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-[var(--border)]">
            {commentCount > 2 && !showAllComments && (
              <button onClick={() => setShowAllComments(true)} className="text-xs text-brand-500 font-medium hover:underline">
                View all {commentCount} comments
              </button>
            )}
            {visibleComments?.map((c) => (
              <div key={c._id} className="flex items-start gap-2 group">
                <button onClick={() => setViewingUser(c.user?._id)} className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: c.user?.avatar ? undefined : stringToColor(c.user?._id || '') }}>
                  {c.user?.avatar ? <img src={c.user.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{getInitials(c.user?.displayName || '')}</div>}
                </button>
                <div className="flex-1 bg-[var(--surface-2)] rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--text)] mb-0.5">{c.user?.displayName}</p>
                  <p className="text-sm text-[var(--text)]">{c.text}</p>
                </div>
                {(c.user?._id === user?._id || isOwn) && (
                  <button onClick={() => handleDeleteComment(c._id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
            <form onSubmit={handleComment} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: user?.avatar ? undefined : stringToColor(user?._id || '') }}>
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(user?.displayName || '')}
              </div>
              <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-400/30" />
              <button type="submit" disabled={sending || !commentText.trim()}
                className="w-8 h-8 flex items-center justify-center bg-brand-600 rounded-xl disabled:opacity-40 hover:bg-brand-700">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-sm w-full border border-[var(--border)] shadow-2xl animate-slide-up">
            <h3 className="font-bold text-lg text-[var(--text)] mb-2">Delete Post?</h3>
            <p className="text-sm text-[var(--text-muted)] mb-5">This will permanently delete your post. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-[var(--surface-2)] text-[var(--text-muted)] text-sm font-medium rounded-xl hover:text-[var(--text)]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewingUser && <UserProfileModal userId={viewingUser} onClose={() => setViewingUser(null)} />}
      {showMenu && <div className="fixed inset-0 z-[5]" onClick={() => setShowMenu(false)} />}
    </>
  );
}