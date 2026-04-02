import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';

export default function AccountSettings({ onClose }) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    statusMessage: user?.statusMessage || '',
    isPrivate: user?.isPrivate || false,
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/me/settings', form);
      updateUser(res.data.user);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.new.length < 8) return toast.error('Password must be 8+ characters');
    setSaving(true);
    try {
      await api.put('/users/me/password', { currentPassword: passwords.current, newPassword: passwords.new });
      toast.success('Password changed!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      toast.success('Account deleted.');
      localStorage.clear();
      useAuthStore.getState().logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] rounded-3xl w-full max-w-md shadow-card-dark border border-[var(--border)] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-display font-bold text-lg text-[var(--text)]">Account Settings</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-[var(--border)] overflow-x-auto">
          {[{ id: 'profile', label: 'Profile' }, { id: 'password', label: 'Password' }, { id: 'privacy', label: 'Privacy' }, { id: 'account', label: 'Account' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Display Name</label>
                <input className="input-field mt-1.5 text-sm" value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Username</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">@</span>
                  <input className="input-field pl-7 text-sm" placeholder="yourname"
                    value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-z0-9_.]/gi, '').toLowerCase() })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bio</label>
                <textarea className="input-field mt-1.5 text-sm resize-none" rows={3} placeholder="Tell people about yourself..."
                  value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={200} />
                <p className="text-xs text-[var(--text-muted)] text-right mt-1">{form.bio.length}/200</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</label>
                <input className="input-field mt-1.5 text-sm" value={form.statusMessage}
                  onChange={(e) => setForm({ ...form, statusMessage: e.target.value })} maxLength={150} />
              </div>
              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full h-11 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <form onSubmit={changePassword} className="space-y-4">
              {[
                { key: 'current', label: 'Current Password', show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { key: 'new', label: 'New Password', show: showNew, toggle: () => setShowNew(!showNew) },
                { key: 'confirm', label: 'Confirm New Password', show: showNew, toggle: () => setShowNew(!showNew) },
              ].map(({ key, label, show, toggle }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
                  <div className="relative mt-1.5">
                    <input type={show ? 'text' : 'password'} className="input-field text-sm pr-10"
                      value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} required />
                    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={saving} className="btn-primary w-full h-11 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}

          {/* Privacy Tab */}
          {tab === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-2xl">
                <div>
                  <p className="font-semibold text-sm text-[var(--text)]">Private Account</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Only friends can see your posts</p>
                </div>
                <button onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.isPrivate ? 'bg-brand-600' : 'bg-[var(--border)]'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isPrivate ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] px-1">
                {form.isPrivate
                  ? '🔒 Your posts are only visible to friends. New followers need to send a friend request.'
                  : '🌍 Your posts are visible to everyone on Sweetchat.'}
              </p>
              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full h-11 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>
          )}

          {/* Account Tab */}
          {tab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--surface-2)] rounded-2xl space-y-4">
                <div>
                  <p className="font-semibold text-sm text-[var(--text)]">Sign Out</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-2">Log out of your Sweetchat account on this device.</p>
                  <button onClick={() => {
                    localStorage.clear();
                    useAuthStore.getState().logout();
                  }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--surface-3)] text-[var(--text)] hover:bg-[var(--surface)] text-sm transition-colors border border-[var(--border)]">
                    Sign Out
                  </button>
                </div>
                
                <hr className="border-[var(--border)]" />

                <div>
                  <p className="font-semibold text-sm text-red-500">Delete Account</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-2">Permanently delete your account and all data.</p>
                  
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm transition-colors">
                      Delete Account
                    </button>
                  ) : (
                    <div className="border border-red-500/30 rounded-xl p-4 bg-red-500/10 animate-fade-in">
                      <p className="text-sm font-semibold text-red-500 mb-1">Are you absolutely sure?</p>
                      <p className="text-xs text-red-400/80 mb-3">This action cannot be undone.</p>
                      <div className="flex gap-2">
                        <button onClick={handleDeleteAccount} disabled={deleting}
                          className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
                          {deleting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          Yes, Delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                          className="flex-1 py-2 rounded-xl bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-medium transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}