import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-lg p-0 sm:p-4">
      <div className="bg-[var(--bg)] w-full max-w-lg h-[92dvh] sm:h-[85vh] rounded-t-[36px] sm:rounded-[36px] shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-slide-up">
        {/* Android Sheet Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 bg-[var(--surface)]">
          <div className="w-12 h-1.5 bg-[var(--border-strong)] rounded-full opacity-60" />
        </div>

        {/* Android Material 3 Settings Top App Bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors gesture-press">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="font-display font-bold text-xl text-[var(--text)] tracking-tight">Settings</h2>
            <p className="text-xs text-[var(--text-muted)]">Preferences & Account Management</p>
          </div>
        </div>

        {/* Android Material 3 Segmented Pill Navigation */}
        <div className="flex gap-2 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] overflow-x-auto flex-shrink-0">
          {[
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'password', label: 'Security', icon: '🔒' },
            { id: 'privacy', label: 'Privacy', icon: '🛡️' },
            { id: 'account', label: 'System', icon: '⚙️' }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all gesture-press ${tab === t.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Android Settings Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl space-y-4 shadow-sm">
                <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Public Information</p>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Display Name</label>
                  <input className="input-field mt-1.5 text-sm font-medium" value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Username</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-semibold text-sm">@</span>
                    <input className="input-field pl-8 text-sm font-medium" placeholder="yourname"
                      value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-z0-9_.]/gi, '').toLowerCase() })} />
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl space-y-4 shadow-sm">
                <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Bio & Status</p>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Bio</label>
                  <textarea className="input-field mt-1.5 text-sm font-medium resize-none" rows={3} placeholder="Tell people about yourself..."
                    value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={200} />
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] text-right mt-1">{form.bio.length}/200</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Status Message</label>
                  <input className="input-field mt-1.5 text-sm font-medium" value={form.statusMessage}
                    onChange={(e) => setForm({ ...form, statusMessage: e.target.value })} maxLength={150} />
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg gesture-press">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {tab === 'password' && (
            <form onSubmit={changePassword} className="space-y-4">
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl space-y-4 shadow-sm">
                <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Password & Authentication</p>
                {[
                  { key: 'current', label: 'Current Password', show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                  { key: 'new', label: 'New Password', show: showNew, toggle: () => setShowNew(!showNew) },
                  { key: 'confirm', label: 'Confirm New Password', show: showNew, toggle: () => setShowNew(!showNew) },
                ].map(({ key, label, show, toggle }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-[var(--text-muted)]">{label}</label>
                    <div className="relative mt-1.5">
                      <input type={show ? 'text' : 'password'} className="input-field text-sm pr-10 font-medium"
                        value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} required />
                      <button type="button" onClick={toggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg gesture-press">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Changing...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Privacy Tab */}
          {tab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl space-y-4 shadow-sm">
                <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Account Visibility</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-[var(--text)]">Private Profile</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Only approved friends can view your posts</p>
                  </div>
                  {/* Android Material 3 Spring Switch */}
                  <button onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
                    className={`relative w-13 h-7 rounded-full transition-colors duration-300 ${form.isPrivate ? 'bg-brand-600' : 'bg-[var(--border-strong)]'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${form.isPrivate ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg gesture-press">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Save Privacy Controls'}
              </button>
            </div>
          )}

          {/* System Tab */}
          {tab === 'account' && (
            <div className="space-y-4">
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl space-y-5 shadow-sm">
                <div>
                  <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">Theme Accent</p>
                  <div className="flex items-center gap-3.5">
                    {[
                      { id: 'violet', color: '#7c3aed', label: 'Violet' },
                      { id: 'indigo', color: '#6366f1', label: 'Indigo' },
                      { id: 'emerald', color: '#10b981', label: 'Emerald' },
                      { id: 'rose', color: '#f43f5e', label: 'Rose' },
                      { id: 'amber', color: '#f59e0b', label: 'Amber' },
                    ].map((item) => (
                      <button key={item.id} onClick={() => useThemeStore.getState().setAccentColor(item.id)}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 ring-4 ring-white/10 shadow-md gesture-press"
                        style={{ backgroundColor: item.color }}
                        title={item.label}>
                        {useThemeStore.getState().accentColor === item.id && (
                          <span className="w-3 h-3 bg-white rounded-full shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-[var(--border)]" />

                <div>
                  <p className="font-bold text-sm text-[var(--text)]">Sign Out</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-3">Log out of your Sweetchat account on this device</p>
                  <button onClick={() => {
                    localStorage.clear();
                    useAuthStore.getState().logout();
                  }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-semibold text-sm transition-colors border border-[var(--border)] gesture-press">
                    Sign Out
                  </button>
                </div>

                <hr className="border-[var(--border)]" />

                <div>
                  <p className="font-bold text-sm text-red-500">Delete Account</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-3">Permanently delete your account and all data</p>

                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-semibold text-sm transition-colors gesture-press">
                      Delete Account
                    </button>
                  ) : (
                    <div className="border border-red-500/30 rounded-2xl p-4 bg-red-500/10 animate-fade-in">
                      <p className="text-sm font-bold text-red-500 mb-1">Are you absolutely sure?</p>
                      <p className="text-xs text-red-400/80 mb-3">This action cannot be undone.</p>
                      <div className="flex gap-2">
                        <button onClick={handleDeleteAccount} disabled={deleting}
                          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                          {deleting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          Yes, Delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                          className="flex-1 py-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-medium transition-colors">
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