import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [form, setForm] = useState({
    displayName: '', email: '', password: '', confirm: ''
  });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) return toast.error('Name is required');
    if (!form.email) return toast.error('Email is required');
    if (form.password.length < 8) return toast.error('Password must be 8+ characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    
    const res = await signup({ displayName: form.displayName.trim(), email: form.email, password: form.password });
    if (res.success) { 
      toast.success('Account created! 🎉'); 
      navigate('/'); 
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-8">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Create Account</h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm">Join Sweetchat today</p>
        </div>

        <div className="bg-[var(--surface)] rounded-3xl shadow-card border border-[var(--border)] p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Display Name</label>
              <input type="text" className="input-field" placeholder="Your full name"
                value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} autoFocus />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input-field pr-11" placeholder="Min 8 characters"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              {form.password && (
                <div className="mt-1.5 flex gap-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      form.password.length >= i * 3
                        ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-emerald-400'
                        : 'bg-[var(--border)]'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Confirm Password</label>
              <input type="password" className="input-field" placeholder="Repeat password"
                value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full h-12 flex items-center justify-center gap-2 mt-4">
              {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isLoading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Have an account? <Link to="/login" className="text-brand-500 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
