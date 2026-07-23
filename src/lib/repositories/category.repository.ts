// ============================================================
// Category Repository
// ============================================================

import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types';

export const categoryRepository = {
  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date();
    const category: Category = {
      id: uuidv4(),
      name: input.name,
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    await db.categories.add(category);
    return category;
  },

  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async list(): Promise<Category[]> {
    return db.categories.orderBy('name').toArray();
  },

  async update(id: string, changes: UpdateCategoryInput): Promise<void> {
    await db.categories.update(id, { ...changes, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    // Unlink entries from this category
    const entries = await db.entries.where('categoryId').equals(id).toArray();
    for (const entry of entries) {
      await db.entries.update(entry.id, { categoryId: null, updatedAt: new Date() });
    }
    await db.categories.delete(id);
  },

  async count(): Promise<number> {
    return db.categories.count();
  },
};
