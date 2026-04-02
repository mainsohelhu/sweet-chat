import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ChatPage from './pages/ChatPage';
import { SocketProvider } from './hooks/useSocket';

// Memoized app shell — never re-renders, so SocketProvider never remounts
const AppShell = React.memo(() => (
  <SocketProvider>
    <ChatPage />
  </SocketProvider>
));

function AuthGuard({ children, requireAuth }) {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuthed = !!(token && user);
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    if (requireAuth && !isAuthed) {
      redirected.current = true;
      navigate('/login', { replace: true });
    } else if (!requireAuth && isAuthed) {
      redirected.current = true;
      navigate('/', { replace: true });
    }
  }, [isAuthed, requireAuth, navigate]);

  useEffect(() => {
    redirected.current = false;
  }, [isAuthed]);

  if (requireAuth && !isAuthed) return null;
  if (!requireAuth && isAuthed) return null;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"                 element={<AuthGuard requireAuth={false}><LoginPage /></AuthGuard>} />
      <Route path="/signup"                element={<AuthGuard requireAuth={false}><SignupPage /></AuthGuard>} />
      <Route path="/forgot-password"       element={<AuthGuard requireAuth={false}><ForgotPasswordPage /></AuthGuard>} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token"   element={<VerifyEmailPage />} />
      <Route path="/*" element={
        <AuthGuard requireAuth={true}>
          <AppShell />
        </AuthGuard>
      } />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}