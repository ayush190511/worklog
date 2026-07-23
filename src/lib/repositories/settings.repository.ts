// ============================================================
// Settings Repository
// ============================================================

import { db } from '@/lib/db/database';
import type { Settings, ThemeMode } from '@/types';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export const settingsRepository = {
  async get(): Promise<Settings> {
    const settings = await db.settings.get(SETTINGS_ID);
    if (!settings) {
      const defaults: Settings = {
        id: SETTINGS_ID,
        theme: 'dark',
        keyboardShortcuts: {},
        updatedAt: new Date(),
      };
      await db.settings.put(defaults);
      return defaults;
    }
    return settings;
  },

  async setTheme(theme: ThemeMode): Promise<void> {
    await db.settings.update(SETTINGS_ID, { theme, updatedAt: new Date() });
  },

  async update(changes: Partial<Omit<Settings, 'id'>>): Promise<void> {
    await db.settings.update(SETTINGS_ID, { ...changes, updatedAt: new Date() });
  },
};
