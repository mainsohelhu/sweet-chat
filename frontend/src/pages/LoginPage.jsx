import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) return toast.error('Fill in all fields');
    const res = await login(form.identifier, form.password);
    if (res.success) { 
      toast.success('Welcome back!'); 
      navigate('/'); 
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
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
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Sweetchat</h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm">Sign in to continue</p>
        </div>

        <div className="bg-[var(--surface)] rounded-3xl shadow-card border border-[var(--border)] p-8">
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoFocus />
            </div>
            
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text)]">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-500 font-medium">Forgot?</Link>
              </div>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input-field pr-11" placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={isLoading} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
              {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            No account? <Link to="/signup" className="text-brand-500 font-semibold">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
