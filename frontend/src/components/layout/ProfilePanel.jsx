import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor } from '../../utils/helpers';
import AccountSettings from './AccountSettings';
import PostCard from '../posts/PostCard';
import AvatarCropper from '../profile/AvatarCropper';
import MediaViewer from '../ui/MediaViewer';

export default function ProfilePanel() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [showSettings, setShowSettings] = useState(false);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // posts | friends
  
  const [imageToCrop, setImageToCrop] = useState(null);
  const [viewAvatar, setViewAvatar] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);

  React.useEffect(() => {
    if (user?._id) {
       api.get(`/users/${user._id}/profile`).then(res => setPosts(res.data.posts || [])).catch(() => {});
       api.get(`/friends`).then(res => setFriends(res.data.friends || res.data || [])).catch(() => {});
    }
  }, [user?._id]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    
    const reader = new FileReader();
    reader.onload = () => setImageToCrop(reader.result);
    reader.readAsDataURL(file);
    e.target.value = null; // reset
  };

  const uploadCroppedAvatar = async (fileBlob) => {
    setImageToCrop(null);
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', fileBlob);
    try {
      const res = await api.post('/uploads/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ avatar: res.data.url });
      toast.success('Avatar updated!');
    } catch (_) { toast.error('Upload failed'); }
    setUploadingAvatar(false);
  };

  const handleDeleteAvatar = async () => {
    try {
      const res = await api.delete('/users/me/avatar');
      updateUser(res.data.user);
      toast.success('Avatar removed');
    } catch (_) {
      toast.error('Could not remove avatar');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <div className="px-4 pt-4 pb-2 border-b border-[var(--border)] bg-[var(--surface)]">
        <h1 className="font-display text-xl font-bold text-[var(--text)] tracking-tight">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Android Material 3 Hero Profile Card */}
        <div className="p-6 bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] border border-[var(--border)] rounded-3xl flex flex-col items-center shadow-lg relative overflow-hidden">
          <div className="relative group mb-3">
            <button className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold transition-transform duration-300 hover:scale-105 shadow-xl ring-4 ring-brand-500/20 gesture-press"
              style={{ background: user?.avatar ? undefined : stringToColor(user?._id || '') }}
              onClick={() => user?.avatar && setViewAvatar(true)}>
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(user?.displayName || '')}
            </button>
            <button onClick={() => fileRef.current?.click()}
              title="Upload photo"
              className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg border-2 border-[var(--bg)] hover:bg-brand-700 transition-transform active:scale-90 gesture-press">
              {uploadingAvatar
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
            </button>
            {user?.avatar && (
              <button onClick={handleDeleteAvatar}
                title="Remove photo"
                className="absolute -bottom-1.5 -left-1.5 w-9 h-9 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg border-2 border-[var(--bg)] hover:bg-red-600 transition-transform active:scale-90 gesture-press">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>
          <h2 className="font-display font-bold text-xl text-[var(--text)] tracking-tight">{user?.displayName}</h2>
          {user?.username && <p className="text-xs font-semibold text-brand-400 mt-0.5">@{user.username}</p>}
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email || user?.phone}</p>
          {user?.isPrivate && <span className="mt-2 text-[10px] font-semibold bg-brand-600/20 text-brand-300 px-3 py-1 rounded-full border border-brand-500/20">🔒 Private Account</span>}
        </div>

        {/* Status / Bio Card */}
        {(user?.bio || user?.statusMessage) && (
          <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-3xl space-y-3 shadow-sm">
            {user?.statusMessage && (
              <div>
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-sm text-[var(--text)] leading-relaxed">{user.statusMessage}</p>
              </div>
            )}
            {user?.bio && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Bio</p>
                <p className="text-sm text-[var(--text)] leading-relaxed">{user.bio}</p>
              </div>
            )}
          </div>
        )}

        {/* Account Settings button */}
        <button onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3.5 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-3xl hover:bg-[var(--surface-2)] transition-all text-left shadow-sm gesture-hover gesture-press">
          <div className="w-10 h-10 bg-brand-600/20 text-brand-400 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[var(--text)]">Account Settings</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Edit profile, security & preferences</p>
          </div>
          <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Tabs for Posts / Friends */}
        <div className="flex gap-4 border-b border-[var(--border)] mb-4 sticky top-0 bg-[var(--bg)]/90 backdrop-blur z-10 pt-2">
          <button onClick={() => setActiveTab('posts')}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'posts' ? 'border-brand-500 text-brand-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
            My Posts
          </button>
          <button onClick={() => setActiveTab('friends')}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'friends' ? 'border-brand-500 text-brand-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
            Friends
          </button>
        </div>

        {activeTab === 'posts' ? (
          <div>
            {posts.length > 0 ? (
              posts.map(post => (
                <PostCard key={post._id} post={post} onDelete={() => setPosts(prev => prev.filter(p => p._id !== post._id))} compact />
              ))
            ) : (
              <div className="text-center py-8 bg-[var(--surface-2)] rounded-3xl text-[var(--text-muted)]">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm">You haven't made any posts yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {friends.length > 0 ? (
              friends.map(friend => (
                <div key={friend._id} className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-2xl hover:bg-[var(--surface-3)] transition-colors">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: friend.avatar ? undefined : stringToColor(friend._id) }}>
                      {friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(friend.displayName)}
                    </div>
                    {friend.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[var(--text)]">{friend.displayName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{friend.username ? `@${friend.username}` : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-[var(--surface-2)] rounded-3xl text-[var(--text-muted)]">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm">No friends yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showSettings && <AccountSettings onClose={() => setShowSettings(false)} />}
      {imageToCrop && <AvatarCropper image={imageToCrop} onCancel={() => setImageToCrop(null)} onCropComplete={uploadCroppedAvatar} />}
      {viewAvatar && <MediaViewer url={user.avatar} type="image" onClose={() => setViewAvatar(false)} />}
    </div>
  );
}