// ============================================================
// Entry Repository — CRUD + soft-delete + versioning
// ============================================================

import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import type {
  Entry,
  CreateEntryInput,
  UpdateEntryInput,
  EntryWithRelations,
  EntryTag,
  VersionRecord,
  TrashRecord,
  EntryFilters,
  SortField,
  SortOrder,
} from '@/types';

const TRASH_EXPIRY_DAYS = 60;

export const entryRepository = {
  /** Create a new entry */
  async create(input: CreateEntryInput): Promise<Entry> {
    const now = new Date();
    const entry: Entry = {
      id: uuidv4(),
      projectId: input.projectId ?? null,
      title: input.title ?? '',
      content: input.content ?? '',
      categoryId: input.categoryId ?? null,
      favorite: false,
      pinned: false,
      visibility: 'private',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.entries.add(entry);
    // Create initial version
    await this.createVersion(entry);
    return entry;
  },

  /** Get a single entry by ID */
  async getById(id: string): Promise<Entry | undefined> {
    return db.entries.get(id);
  },

  /** Get entry with all relations resolved */
  async getWithRelations(id: string): Promise<EntryWithRelations | undefined> {
    const entry = await db.entries.get(id);
    if (!entry) return undefined;

    const [project, category, entryTags, imageCount, documentCount] = await Promise.all([
      entry.projectId ? db.projects.get(entry.projectId) : null,
      entry.categoryId ? db.categories.get(entry.categoryId) : null,
      db.entryTags.where('entryId').equals(id).toArray(),
      db.images.where('entryId').equals(id).count(),
      db.documents.where('entryId').equals(id).count(),
    ]);

    const tagIds = entryTags.map((et) => et.tagId);
    const tags = tagIds.length > 0 ? await db.tags.where('id').anyOf(tagIds).toArray() : [];

    return {
      ...entry,
      project: project ?? null,
      category: category ?? null,
      tags,
      imageCount,
      documentCount,
    };
  },

  /** List entries with filters, sorting, and pagination */
  async list(
    filters: EntryFilters = {},
    sortBy: SortField = 'createdAt',
    sortOrder: SortOrder = 'desc',
    offset = 0,
    limit = 50
  ): Promise<EntryWithRelations[]> {
    // Fetch all non-deleted entries (IndexedDB null indexing workaround: filter in-memory)
    let entries = await db.entries
      .orderBy(sortBy)
      .filter((e) => !e.deletedAt)
      .toArray();

    // Apply filters
    if (filters.projectId) {
      entries = entries.filter((e) => e.projectId === filters.projectId);
    }
    if (filters.categoryId) {
      entries = entries.filter((e) => e.categoryId === filters.categoryId);
    }
    if (filters.favoritesOnly) {
      entries = entries.filter((e) => e.favorite);
    }
    if (filters.pinnedOnly) {
      entries = entries.filter((e) => e.pinned);
    }
    if (filters.dateFrom) {
      const from = filters.dateFrom.getTime();
      entries = entries.filter((e) => e.createdAt.getTime() >= from);
    }
    if (filters.dateTo) {
      const to = filters.dateTo.getTime();
      entries = entries.filter((e) => e.createdAt.getTime() <= to);
    }
    if (filters.tagId) {
      const entryTags = await db.entryTags.where('tagId').equals(filters.tagId).toArray();
      const entryIds = new Set(entryTags.map((et) => et.entryId));
      entries = entries.filter((e) => entryIds.has(e.id));
    }

    // Sort
    entries.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'desc'
          ? bVal.getTime() - aVal.getTime()
          : aVal.getTime() - bVal.getTime();
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortOrder === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });

    // Paginate
    const paged = entries.slice(offset, offset + limit);

    // Resolve relations
    return Promise.all(paged.map((e) => this.resolveRelations(e)));
  },

  /** Get recent entries */
  async getRecent(limit = 10): Promise<EntryWithRelations[]> {
    return this.list({}, 'createdAt', 'desc', 0, limit);
  },

  /** Get pinned entries */
  async getPinned(): Promise<EntryWithRelations[]> {
    return this.list({ pinnedOnly: true }, 'updatedAt', 'desc', 0, 100);
  },

  /** Get favorite entries */
  async getFavorites(): Promise<EntryWithRelations[]> {
    return this.list({ favoritesOnly: true }, 'updatedAt', 'desc', 0, 100);
  },

  /** Update an entry (auto-versions) */
  async update(id: string, changes: UpdateEntryInput): Promise<void> {
    const entry = await db.entries.get(id);
    if (!entry) return;

    const updated: Entry = {
      ...entry,
      ...changes,
      updatedAt: new Date(),
    };
    await db.entries.put(updated);

    // Only version if title or content changed
    if (changes.title !== undefined || changes.content !== undefined) {
      await this.createVersion(updated);
    }
  },

  /** Soft-delete an entry → move to trash */
  async softDelete(id: string): Promise<void> {
    const entry = await db.entries.get(id);
    if (!entry) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRASH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Get all related data for snapshot
    const [entryTags, images, documents] = await Promise.all([
      db.entryTags.where('entryId').equals(id).toArray(),
      db.images.where('entryId').equals(id).toArray(),
      db.documents.where('entryId').equals(id).toArray(),
    ]);

    // Create trash record with full snapshot
    const trashRecord: TrashRecord = {
      id: uuidv4(),
      entityType: 'entry',
      entityId: id,
      entityData: {
        entry: { ...entry, deletedAt: now },
        entryTags,
        imagesMeta: images.map(({ id, entryId, name, mimeType, size, createdAt }) => ({
          id, entryId, name, mimeType, size, createdAt,
        })),
        documentsMeta: documents.map(({ id, entryId, name, mimeType, size, createdAt }) => ({
          id, entryId, name, mimeType, size, createdAt,
        })),
      },
      deletedAt: now,
      expiresAt,
    };

    await db.transaction('rw', [db.entries, db.trash], async () => {
      await db.entries.update(id, { deletedAt: now, updatedAt: now });
      await db.trash.add(trashRecord);
    });
  },

  /** Restore an entry from trash */
  async restore(trashId: string): Promise<void> {
    const trashRecord = await db.trash.get(trashId);
    if (!trashRecord || trashRecord.entityType !== 'entry') return;

    await db.transaction('rw', [db.entries, db.trash], async () => {
      await db.entries.update(trashRecord.entityId, {
        deletedAt: null,
        updatedAt: new Date(),
      });
      await db.trash.delete(trashId);
    });
  },

  /** Permanently delete an entry and all related data */
  async permanentDelete(entryId: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.entries, db.entryTags, db.images, db.documents, db.versionHistory, db.trash],
      async () => {
        await db.entryTags.where('entryId').equals(entryId).delete();
        await db.images.where('entryId').equals(entryId).delete();
        await db.documents.where('entryId').equals(entryId).delete();
        await db.versionHistory.where('entryId').equals(entryId).delete();
        await db.trash.where('entityId').equals(entryId).delete();
        await db.entries.delete(entryId);
      }
    );
  },

  /** Toggle favorite */
  async toggleFavorite(id: string): Promise<boolean> {
    const entry = await db.entries.get(id);
    if (!entry) return false;
    const newVal = !entry.favorite;
    await db.entries.update(id, { favorite: newVal, updatedAt: new Date() });
    return newVal;
  },

  /** Toggle pin */
  async togglePin(id: string): Promise<boolean> {
    const entry = await db.entries.get(id);
    if (!entry) return false;
    const newVal = !entry.pinned;
    await db.entries.update(id, { pinned: newVal, updatedAt: new Date() });
    return newVal;
  },

  /** Get total count of active entries */
  async count(): Promise<number> {
    return (await db.entries.filter((e) => !e.deletedAt).count());
  },

  /** Get entries count for this week */
  async countThisWeek(): Promise<number> {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return (await db.entries.filter(
      (e) => !e.deletedAt && e.createdAt >= weekStart
    ).count());
  },

  /** Get activity data for heatmap (last 365 days) */
  async getActivityData(): Promise<{ date: string; count: number }[]> {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    yearAgo.setHours(0, 0, 0, 0);

    const entries = await db.entries
      .filter((e) => !e.deletedAt && e.createdAt >= yearAgo)
      .toArray();

    const countMap = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.createdAt.toISOString().split('T')[0];
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    return Array.from(countMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /** Create a version snapshot */
  async createVersion(entry: Entry): Promise<void> {
    const lastVersion = await db.versionHistory
      .where('entryId')
      .equals(entry.id)
      .reverse()
      .sortBy('version')
      .then((versions) => versions[0]);

    const version: VersionRecord = {
      id: uuidv4(),
      entryId: entry.id,
      title: entry.title,
      content: entry.content,
      categoryId: entry.categoryId,
      projectId: entry.projectId,
      version: (lastVersion?.version ?? 0) + 1,
      createdAt: new Date(),
    };
    await db.versionHistory.add(version);
  },

  /** Get version history for an entry */
  async getVersions(entryId: string): Promise<VersionRecord[]> {
    return db.versionHistory
      .where('entryId')
      .equals(entryId)
      .reverse()
      .sortBy('createdAt');
  },

  /** Restore a version */
  async restoreVersion(entryId: string, versionId: string): Promise<void> {
    const version = await db.versionHistory.get(versionId);
    if (!version) return;

    await this.update(entryId, {
      title: version.title,
      content: version.content,
      categoryId: version.categoryId,
      projectId: version.projectId,
    });
  },

  /** Purge expired trash entries (60 days) */
  async purgeExpiredTrash(): Promise<number> {
    const now = new Date();
    const expired = await db.trash
      .where('expiresAt')
      .below(now)
      .toArray();

    for (const record of expired) {
      if (record.entityType === 'entry') {
        await this.permanentDelete(record.entityId);
      }
    }
    return expired.length;
  },

  // ---- Internal helpers ----

  async resolveRelations(entry: Entry): Promise<EntryWithRelations> {
    const [project, category, entryTags, imageCount, documentCount] = await Promise.all([
      entry.projectId ? db.projects.get(entry.projectId) : null,
      entry.categoryId ? db.categories.get(entry.categoryId) : null,
      db.entryTags.where('entryId').equals(entry.id).toArray(),
      db.images.where('entryId').equals(entry.id).count(),
      db.documents.where('entryId').equals(entry.id).count(),
    ]);

    const tagIds = entryTags.map((et) => et.tagId);
    const tags = tagIds.length > 0 ? await db.tags.where('id').anyOf(tagIds).toArray() : [];

    return {
      ...entry,
      project: project ?? null,
      category: category ?? null,
      tags,
      imageCount,
      documentCount,
    };
  },
};
