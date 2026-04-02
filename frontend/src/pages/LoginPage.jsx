import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import api from '../utils/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [form, setForm] = useState({ identifier: '', password: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Email/password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) return toast.error('Fill in all fields');
    const res = await login(form.identifier, form.password);
    if (res.success) { toast.success('Welcome back!'); navigate('/'); }
    else toast.error(res.message);
  };

  // Phone — send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!form.phone) return toast.error('Enter your phone number');
    setSendingOtp(true);
    try {
      const otpRes = await api.post('/auth/send-otp', { phone: form.phone });
      setStep('otp');
      if (otpRes.data.devOtp) toast.success('Dev OTP: ' + otpRes.data.devOtp, { duration: 30000 });
      else toast.success('OTP sent to ' + form.phone);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
    setSendingOtp(false);
  };

  // Phone — verify OTP and login
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP');
    setVerifyingOtp(true);
    try {
      const res = await api.post('/auth/login-otp', { phone: form.phone, otp });
      const { user, accessToken, refreshToken } = res.data;
      // Manually set auth state
      const { default: useAuthStore } = await import('../store/authStore');
      const saved = { user, token: accessToken, refreshToken };
      localStorage.setItem('sc_auth', JSON.stringify(saved));
      useAuthStore.setState({ user, token: accessToken, refreshToken });
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    }
    setVerifyingOtp(false);
  };

  const resendOtp = async () => {
    setSendingOtp(true);
    try {
      const r = await api.post('/auth/send-otp', { phone: form.phone });
      if (r.data.devOtp) toast.success('Dev OTP: ' + r.data.devOtp, { duration: 30000 });
      else toast.success('OTP resent!');
    } catch (_) { toast.error('Failed to resend'); }
    setSendingOtp(false);
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
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">
            {step === 'otp' ? 'Enter OTP' : 'Sweetchat'}
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm">
            {step === 'otp' ? `Code sent to ${form.phone}` : 'Sign in to continue'}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-3xl shadow-card border border-[var(--border)] p-8">

          {/* Method toggle — only on form step */}
          {step === 'form' && (
            <div className="flex gap-2 mb-5">
              <button type="button" onClick={() => setMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${method === 'email' ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
              <button type="button" onClick={() => setMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${method === 'phone' ? 'bg-brand-600 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone OTP
              </button>
            </div>
          )}

          {/* OTP verification step */}
          {step === 'otp' ? (
            <form onSubmit={handleOtpLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input-field text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={verifyingOtp || otp.length !== 6}
                className="btn-primary w-full h-12 flex items-center justify-center gap-2">
                {verifyingOtp && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {verifyingOtp ? 'Verifying…' : 'Login with OTP'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep('form'); setOtp(''); }}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]">← Change number</button>
                <button type="button" onClick={resendOtp} disabled={sendingOtp}
                  className="text-brand-500 hover:text-brand-600 font-medium">
                  {sendingOtp ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
            </form>
          ) : method === 'email' ? (
            /* Email login */
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email or Phone</label>
                <input type="text" className="input-field" placeholder="you@example.com or +91 9876543210"
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
          ) : (
            /* Phone OTP login */
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone Number</label>
                <input type="tel" className="input-field" placeholder="+91 9876543210"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoFocus />
                <p className="text-xs text-[var(--text-muted)] mt-1.5">We'll send a 6-digit OTP to verify your number</p>
              </div>
              <button type="submit" disabled={sendingOtp} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
                {sendingOtp && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {sendingOtp ? 'Sending OTP…' : 'Send OTP →'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            No account? <Link to="/signup" className="text-brand-500 font-semibold">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
