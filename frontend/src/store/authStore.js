import { create } from 'zustand';
import api from '../utils/api';

const load = () => {
  try { return JSON.parse(localStorage.getItem('sc_auth') || '{}'); } catch { return {}; }
};
const save = (data) => {
  try { localStorage.setItem('sc_auth', JSON.stringify(data)); } catch {}
};

const parseError = (err, fallback) => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
    return err.response.data.errors.map((e) => e.msg || e.message || e).join('. ');
  }
  if (err.message === 'Network Error' || !err.response) {
    return 'Unable to reach backend server. Please verify your connection or backend status.';
  }
  return err.message || fallback;
};

const useAuthStore = create((set, get) => {
  const initial = load();
  return {
    user: initial.user || null,
    token: initial.token || null,
    refreshToken: initial.refreshToken || null,
    isLoading: false,

    login: async (identifier, password) => {
      set({ isLoading: true });
      try {
        const res = await api.post('/auth/login', { identifier, password });
        const { user, accessToken, refreshToken } = res.data;
        save({ user, token: accessToken, refreshToken });
        set({ user, token: accessToken, refreshToken, isLoading: false });
        return { success: true };
      } catch (err) {
        set({ isLoading: false });
        return { success: false, message: parseError(err, 'Login failed. Please try again.') };
      }
    },

    signup: async (data) => {
      set({ isLoading: true });
      try {
        const res = await api.post('/auth/signup', data);
        const { user, accessToken, refreshToken } = res.data;
        save({ user, token: accessToken, refreshToken });
        set({ user, token: accessToken, refreshToken, isLoading: false });
        return { success: true };
      } catch (err) {
        set({ isLoading: false });
        return { success: false, message: parseError(err, 'Signup failed. Please try again.') };
      }
    },

    logout: async () => {
      try { await api.post('/auth/logout', { refreshToken: get().refreshToken }); } catch {}
      localStorage.removeItem('sc_auth');
      set({ user: null, token: null, refreshToken: null });
    },

    updateUser: (updates) => {
      const currentAuth = load();
      const user = { ...get().user, ...updates };
      save({ ...currentAuth, user });
      set({ user });
    },
  };
});

export default useAuthStore;
