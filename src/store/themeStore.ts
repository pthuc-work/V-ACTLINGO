import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'vact_theme';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'system';
}

function applyThemeToDocument(effective: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const initialTheme = getInitialTheme();
const initialEffective = initialTheme === 'system' ? getSystemPreference() : initialTheme;
applyThemeToDocument(initialEffective);

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listen to system changes if theme === 'system'
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (get().theme === 'system') {
        const nextEffective = e.matches ? 'dark' : 'light';
        applyThemeToDocument(nextEffective);
        set({ effectiveTheme: nextEffective });
      }
    });
  }

  return {
    theme: initialTheme,
    effectiveTheme: initialEffective,
    setTheme: (theme: ThemeMode) => {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore
      }
      const effective = theme === 'system' ? getSystemPreference() : theme;
      applyThemeToDocument(effective);
      set({ theme, effectiveTheme: effective });
    },
    toggleTheme: () => {
      const current = get().effectiveTheme;
      const next = current === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  };
});
