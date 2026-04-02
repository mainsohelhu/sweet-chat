import { create } from 'zustand';

const applyTheme = (theme) => {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
};

const initial = localStorage.getItem('sc_theme') || 'light';
applyTheme(initial);

const useThemeStore = create((set) => ({
  theme: initial,
  setTheme: (theme) => {
    localStorage.setItem('sc_theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));

export default useThemeStore;