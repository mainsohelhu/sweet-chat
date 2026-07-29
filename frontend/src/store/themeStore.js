import { create } from 'zustand';

const ACCENT_COLORS = {
  indigo: '#6366f1',
  violet: '#7c3aed',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
};

const applyTheme = (theme, accent = 'violet') => {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.violet;
  document.documentElement.style.setProperty('--color-brand-600', color);
};

const initial = localStorage.getItem('sc_theme') || 'dark';
const initialAccent = localStorage.getItem('sc_accent') || 'violet';
applyTheme(initial, initialAccent);

const useThemeStore = create((set) => ({
  theme: initial,
  accentColor: initialAccent,
  setTheme: (theme) => {
    localStorage.setItem('sc_theme', theme);
    const accent = localStorage.getItem('sc_accent') || 'violet';
    applyTheme(theme, accent);
    set({ theme });
  },
  setAccentColor: (accent) => {
    localStorage.setItem('sc_accent', accent);
    const theme = localStorage.getItem('sc_theme') || 'dark';
    applyTheme(theme, accent);
    set({ accentColor: accent });
  },
}));

export default useThemeStore;