import { create } from 'zustand';
import api from '../utils/api';

const load = () => {
  try { return JSON.parse(localStorage.getItem('sc_auth') || '{}'); } catch { return {}; }
};
const save = (data) => {
  try { localStorage.setItem('sc_auth', JSON.stringify(data)); } catch {}
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
        return { success: false, message: err.response?.data?.message || 'Login failed' };
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
        return { success: false, message: err.response?.data?.message || 'Signup failed' };
      }
    },

    logout: async () => {
      try { await api.post('/auth/logout', { refreshToken: get().refreshToken }); } catch {}
      localStorage.removeItem('sc_auth');
      set({ user: null, token: null, refreshToken: null });
    },

    updateUser: (updates) => {
      const user = { ...get().user, ...updates };
      save({ user, token: get().token, refreshToken: get().refreshToken });
      set({ user });
    },
  };
});

export default useAuthStore;
