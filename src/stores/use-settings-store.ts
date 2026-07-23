// ============================================================
// Settings Store — Theme persistence
// ============================================================

import { create } from 'zustand';
import { settingsRepository } from '@/lib/repositories/settings.repository';
import type { ThemeMode } from '@/types';

interface SettingsState {
  theme: ThemeMode;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  isLoaded: false,

  loadSettings: async () => {
    const settings = await settingsRepository.get();
    set({ theme: settings.theme, isLoaded: true });
    applyTheme(settings.theme);
  },

  setTheme: async (theme) => {
    set({ theme });
    await settingsRepository.setTheme(theme);
    applyTheme(theme);
  },
}));

function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}
