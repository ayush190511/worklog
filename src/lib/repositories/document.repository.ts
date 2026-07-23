// ============================================================
// Document Repository — Blob storage in IndexedDB
// ============================================================

import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentRecord } from '@/types';

export const documentRepository = {
  async add(entryId: string, file: File): Promise<DocumentRecord> {
    const record: DocumentRecord = {
      id: uuidv4(),
      entryId,
      name: file.name,
      mimeType: file.type,
      data: file,
      size: file.size,
      createdAt: new Date(),
    };
    await db.documents.add(record);
    return record;
  },

  async getById(id: string): Promise<DocumentRecord | undefined> {
    return db.documents.get(id);
  },

  async getByEntryId(entryId: string): Promise<DocumentRecord[]> {
    return db.documents.where('entryId').equals(entryId).toArray();
  },

  async delete(id: string): Promise<void> {
    await db.documents.delete(id);
  },

  async deleteByEntryId(entryId: string): Promise<void> {
    await db.documents.where('entryId').equals(entryId).delete();
  },

  /** Trigger a download for a document */
  download(doc: DocumentRecord): void {
    const url = URL.createObjectURL(doc.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  },
};
