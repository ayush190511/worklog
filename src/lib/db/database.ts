// ============================================================
// Dexie.js Database — Work Log
// ============================================================

import Dexie, { type EntityTable } from 'dexie';
import type {
  Project,
  Entry,
  Category,
  Tag,
  EntryTag,
  ImageRecord,
  DocumentRecord,
  Settings,
  TrashRecord,
  VersionRecord,
} from '@/types';

export class ProfessionalMemoryDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  entryTags!: EntityTable<EntryTag, 'id'>;
  images!: EntityTable<ImageRecord, 'id'>;
  documents!: EntityTable<DocumentRecord, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  trash!: EntityTable<TrashRecord, 'id'>;
  versionHistory!: EntityTable<VersionRecord, 'id'>;

  constructor() {
    super('ProfessionalMemoryDB');

    this.version(1).stores({
      projects: 'id, name, archived, createdAt, updatedAt',
      entries: 'id, projectId, categoryId, title, createdAt, updatedAt, favorite, pinned, deletedAt',
      categories: 'id, name, createdAt',
      tags: 'id, name, createdAt',
      entryTags: 'id, entryId, tagId, [entryId+tagId]',
      images: 'id, entryId, createdAt',
      documents: 'id, entryId, createdAt',
      settings: 'id',
      trash: 'id, entityType, entityId, deletedAt, expiresAt',
      versionHistory: 'id, entryId, version, createdAt',
    });
  }
}

export const db = new ProfessionalMemoryDB();
