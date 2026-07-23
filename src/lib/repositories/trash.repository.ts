// ============================================================
// Trash Repository
// ============================================================

import { db } from '@/lib/db/database';
import type { TrashRecord } from '@/types';

export const trashRepository = {
  async list(): Promise<TrashRecord[]> {
    return db.trash.orderBy('deletedAt').reverse().toArray();
  },

  async getById(id: string): Promise<TrashRecord | undefined> {
    return db.trash.get(id);
  },

  async permanentDelete(id: string): Promise<void> {
    const record = await db.trash.get(id);
    if (!record) return;

    if (record.entityType === 'entry') {
      // Delete the actual entry and all related data
      const entryId = record.entityId;
      await db.transaction(
        'rw',
        [db.entries, db.entryTags, db.images, db.documents, db.versionHistory, db.trash],
        async () => {
          await db.entryTags.where('entryId').equals(entryId).delete();
          await db.images.where('entryId').equals(entryId).delete();
          await db.documents.where('entryId').equals(entryId).delete();
          await db.versionHistory.where('entryId').equals(entryId).delete();
          await db.entries.delete(entryId);
          await db.trash.delete(id);
        }
      );
    } else {
      await db.trash.delete(id);
    }
  },

  async emptyTrash(): Promise<void> {
    const allTrash = await db.trash.toArray();
    for (const record of allTrash) {
      await this.permanentDelete(record.id);
    }
  },

  async count(): Promise<number> {
    return db.trash.count();
  },
};
