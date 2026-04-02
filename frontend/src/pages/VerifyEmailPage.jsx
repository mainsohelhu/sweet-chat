// pages/VerifyEmailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <div className="bg-[var(--surface)] rounded-3xl shadow-card border border-[var(--border)] p-12 text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-display text-2xl font-bold text-[var(--text)] mb-2">Email Verified!</h2>
            <p className="text-[var(--text-muted)] mb-6 text-sm">Your account is now fully active.</p>
            <Link to="/login" className="btn-primary">Go to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-display text-2xl font-bold text-[var(--text)] mb-2">Verification Failed</h2>
            <p className="text-[var(--text-muted)] mb-6 text-sm">This link is invalid or has expired.</p>
            <Link to="/login" className="btn-primary">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
