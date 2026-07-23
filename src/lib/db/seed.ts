// ============================================================
// Seed default categories on first launch
// ============================================================

import { db } from './database';
import { v4 as uuidv4 } from 'uuid';
import type { Category } from '@/types';

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Development', color: '#6366f1' },
  { name: 'Design', color: '#f43f5e' },
  { name: 'Meeting', color: '#f59e0b' },
  { name: 'Review', color: '#10b981' },
  { name: 'Research', color: '#8b5cf6' },
  { name: 'Documentation', color: '#06b6d4' },
  { name: 'Planning', color: '#ec4899' },
  { name: 'Communication', color: '#14b8a6' },
  { name: 'Learning', color: '#f97316' },
  { name: 'Other', color: '#64748b' },
];

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export async function seedDatabase(): Promise<void> {
  // Seed categories if empty
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const now = new Date();
    const categories: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: uuidv4(),
      ...cat,
      createdAt: now,
      updatedAt: now,
    }));
    await db.categories.bulkAdd(categories);
  }

  // Seed settings singleton if missing
  const settings = await db.settings.get(SETTINGS_ID);
  if (!settings) {
    await db.settings.put({
      id: SETTINGS_ID,
      theme: 'dark',
      keyboardShortcuts: {},
      updatedAt: new Date(),
    });
  }
}
