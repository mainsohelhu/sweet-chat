import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor, formatMessageTime } from '../../utils/helpers';
import PostCard from './PostCard';

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, statusRes] = await Promise.all([
          api.get(`/users/${userId}/profile`),
          api.get(`/friends/status/${userId}`),
        ]);
        setProfile(profileRes.data.user);
        setPosts(profileRes.data.posts || []);
        setFriendStatus(statusRes.data);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleFriendAction = async () => {
    try {
      if (friendStatus?.status === 'none') {
        await api.post(`/friends/request/${userId}`);
        setFriendStatus({ status: 'pending', isSender: true });
        toast.success('Friend request sent!');
      } else if (friendStatus?.status === 'accepted') {
        await api.delete(`/friends/${userId}`);
        setFriendStatus({ status: 'none' });
        toast.success('Removed from friends');
      } else if (friendStatus?.status === 'pending' && !friendStatus.isSender) {
        await api.put(`/friends/request/${friendStatus.friendshipId}`, { action: 'accept' });
        setFriendStatus({ status: 'accepted' });
        toast.success('Friend request accepted!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const isOwn = userId === currentUser?._id;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-3xl w-full max-w-md shadow-2xl border border-[var(--border)] overflow-hidden animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="font-display font-bold text-lg text-[var(--text)]">User Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <>
              {/* Profile header */}
              <div className="flex flex-col items-center py-6 px-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white text-xl font-bold mb-3"
                  style={{ background: profile.avatar ? undefined : stringToColor(profile._id) }}>
                  {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(profile.displayName)}
                </div>
                <h3 className="font-display font-bold text-xl text-[var(--text)]">{profile.displayName}</h3>
                {profile.username && <p className="text-sm text-[var(--text-muted)] mt-0.5">@{profile.username}</p>}
                {profile.isOnline
                  ? <span className="text-xs text-emerald-500 mt-1 font-medium">🟢 Online</span>
                  : <span className="text-xs text-[var(--text-muted)] mt-1">Offline</span>}
              </div>

              {/* Bio / Info section */}
              <div className="mx-4 mb-4 p-4 bg-[var(--surface-2)] rounded-2xl space-y-3">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">User Profile</p>
                {profile.bio && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Bio</p>
                    <p className="text-sm text-[var(--text)]">{profile.bio}</p>
                  </div>
                )}
                {profile.statusMessage && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
                    <p className="text-sm text-[var(--text)]">{profile.statusMessage}</p>
                  </div>
                )}
                {profile.isPrivate && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Private account
                  </div>
                )}
              </div>

              {/* Action button */}
              {!isOwn && (
                <div className="mx-4 mb-4">
                  <button onClick={handleFriendAction}
                    className={`w-full h-10 rounded-xl text-sm font-semibold transition-all ${
                      friendStatus?.status === 'accepted' ? 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-red-500'
                      : friendStatus?.status === 'pending' && friendStatus.isSender ? 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                      : 'btn-primary'
                    }`}>
                    {friendStatus?.status === 'accepted' ? 'Remove Friend'
                      : friendStatus?.status === 'pending' && friendStatus.isSender ? 'Request Sent'
                      : friendStatus?.status === 'pending' && !friendStatus.isSender ? 'Accept Request'
                      : 'Add Friend'}
                  </button>
                </div>
              )}

              {/* Posts */}
              {posts.length > 0 ? (
                <div className="px-4 pb-4">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Posts</p>
                  {posts.map(post => (
                    <PostCard key={post._id} post={post} onDelete={() => setPosts(prev => prev.filter(p => p._id !== post._id))} compact />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  {profile.isPrivate && friendStatus?.status !== 'accepted' && !isOwn
                    ? <><div className="text-3xl mb-2">🔒</div><p className="text-sm">This account is private</p></>
                    : <><div className="text-3xl mb-2">📝</div><p className="text-sm">No posts yet</p></>}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-[var(--text-muted)]">User not found</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}