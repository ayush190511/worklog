// ============================================================
// Image Repository — Blob storage in IndexedDB
// ============================================================

import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { ImageRecord } from '@/types';

export const imageRepository = {
  async add(entryId: string, file: File): Promise<ImageRecord> {
    const record: ImageRecord = {
      id: uuidv4(),
      entryId,
      name: file.name,
      mimeType: file.type,
      data: file,
      size: file.size,
      createdAt: new Date(),
    };
    await db.images.add(record);
    return record;
  },

  async addMultiple(entryId: string, files: File[]): Promise<ImageRecord[]> {
    const records: ImageRecord[] = files.map((file) => ({
      id: uuidv4(),
      entryId,
      name: file.name,
      mimeType: file.type,
      data: file,
      size: file.size,
      createdAt: new Date(),
    }));
    await db.images.bulkAdd(records);
    return records;
  },

  async getById(id: string): Promise<ImageRecord | undefined> {
    return db.images.get(id);
  },

  async getByEntryId(entryId: string): Promise<ImageRecord[]> {
    return db.images.where('entryId').equals(entryId).toArray();
  },

  async getRecent(limit = 20): Promise<ImageRecord[]> {
    return db.images.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  async delete(id: string): Promise<void> {
    await db.images.delete(id);
  },

  async deleteByEntryId(entryId: string): Promise<void> {
    await db.images.where('entryId').equals(entryId).delete();
  },

  /** Create an object URL for display (must be revoked after use) */
  createObjectUrl(image: ImageRecord): string {
    return URL.createObjectURL(image.data);
  },
};
