// ============================================================
// Tag Repository
// ============================================================

import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { Tag, CreateTagInput, EntryTag } from '@/types';

export const tagRepository = {
  async create(input: CreateTagInput): Promise<Tag> {
    const now = new Date();
    const tag: Tag = {
      id: uuidv4(),
      name: input.name,
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    await db.tags.add(tag);
    return tag;
  },

  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  async list(): Promise<Tag[]> {
    return db.tags.orderBy('name').toArray();
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.tags, db.entryTags], async () => {
      await db.entryTags.where('tagId').equals(id).delete();
      await db.tags.delete(id);
    });
  },

  async addToEntry(entryId: string, tagId: string): Promise<void> {
    // Check if already exists
    const existing = await db.entryTags
      .where('[entryId+tagId]')
      .equals([entryId, tagId])
      .first();
    if (existing) return;

    const entryTag: EntryTag = {
      id: uuidv4(),
      entryId,
      tagId,
      createdAt: new Date(),
    };
    await db.entryTags.add(entryTag);
  },

  async removeFromEntry(entryId: string, tagId: string): Promise<void> {
    await db.entryTags.where('[entryId+tagId]').equals([entryId, tagId]).delete();
  },

  async getTagsForEntry(entryId: string): Promise<Tag[]> {
    const entryTags = await db.entryTags.where('entryId').equals(entryId).toArray();
    const tagIds = entryTags.map((et) => et.tagId);
    if (tagIds.length === 0) return [];
    return db.tags.where('id').anyOf(tagIds).toArray();
  },

  async count(): Promise<number> {
    return db.tags.count();
  },
};
