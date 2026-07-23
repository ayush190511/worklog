// ============================================================
// Export / Import — JSON only
// ============================================================

import { db } from '@/lib/db/database';

interface ExportData {
  version: 1;
  exportedAt: string;
  app: 'ProfessionalMemory';
  data: {
    projects: unknown[];
    entries: unknown[];
    categories: unknown[];
    tags: unknown[];
    entryTags: unknown[];
    images: unknown[];  // images are exported WITHOUT blob data (too large)
    documents: unknown[]; // documents are exported WITHOUT blob data
    settings: unknown[];
    versionHistory: unknown[];
  };
}

export const exportService = {
  /** Export all data as a downloadable JSON file */
  async exportAll(): Promise<void> {
    const [projects, entries, categories, tags, entryTags, images, documents, settings, versionHistory] =
      await Promise.all([
        db.projects.toArray(),
        db.entries.toArray(),
        db.categories.toArray(),
        db.tags.toArray(),
        db.entryTags.toArray(),
        db.images.toArray(),
        db.documents.toArray(),
        db.settings.toArray(),
        db.versionHistory.toArray(),
      ]);

    // Strip blob data from images and documents for export
    const imagesMeta = images.map(({ data, ...rest }) => rest);
    const documentsMeta = documents.map(({ data, ...rest }) => rest);

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'ProfessionalMemory',
      data: {
        projects,
        entries,
        categories,
        tags,
        entryTags,
        images: imagesMeta,
        documents: documentsMeta,
        settings,
        versionHistory,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `professional-memory-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Import data from a JSON file (merges, does not replace) */
  async importFromFile(file: File): Promise<{ imported: number; errors: string[] }> {
    const text = await file.text();
    let parsed: ExportData;

    try {
      parsed = JSON.parse(text);
    } catch {
      return { imported: 0, errors: ['Invalid JSON file'] };
    }

    if (parsed.app !== 'ProfessionalMemory' || !parsed.data) {
      return { imported: 0, errors: ['Not a valid Professional Memory backup file'] };
    }

    const errors: string[] = [];
    let imported = 0;

    try {
      await db.transaction(
        'rw',
        [db.projects, db.entries, db.categories, db.tags, db.entryTags, db.settings, db.versionHistory],
        async () => {
          // Convert date strings back to Date objects
          const convertDates = (obj: Record<string, unknown>) => {
            const dateFields = ['createdAt', 'updatedAt', 'deletedAt', 'expiresAt'];
            for (const field of dateFields) {
              if (obj[field] && typeof obj[field] === 'string') {
                obj[field] = new Date(obj[field] as string);
              }
            }
            return obj;
          };

          for (const project of parsed.data.projects ?? []) {
            try {
              await db.projects.put(convertDates(project as Record<string, unknown>) as never);
              imported++;
            } catch (e) { errors.push(`Project import error: ${(e as Error).message}`); }
          }

          for (const category of parsed.data.categories ?? []) {
            try {
              await db.categories.put(convertDates(category as Record<string, unknown>) as never);
              imported++;
            } catch (e) { errors.push(`Category import error: ${(e as Error).message}`); }
          }

          for (const tag of parsed.data.tags ?? []) {
            try {
              await db.tags.put(convertDates(tag as Record<string, unknown>) as never);
              imported++;
            } catch (e) { errors.push(`Tag import error: ${(e as Error).message}`); }
          }

          for (const entry of parsed.data.entries ?? []) {
            try {
              await db.entries.put(convertDates(entry as Record<string, unknown>) as never);
              imported++;
            } catch (e) { errors.push(`Entry import error: ${(e as Error).message}`); }
          }

          for (const et of parsed.data.entryTags ?? []) {
            try {
              await db.entryTags.put(convertDates(et as Record<string, unknown>) as never);
              imported++;
            } catch (e) { errors.push(`EntryTag import error: ${(e as Error).message}`); }
          }

          for (const vh of parsed.data.versionHistory ?? []) {
            try {
              await db.versionHistory.put(convertDates(vh as Record<string, unknown>) as never);
              imported++;
            } catch (e) { errors.push(`Version import error: ${(e as Error).message}`); }
          }
        }
      );
    } catch (e) {
      errors.push(`Transaction error: ${(e as Error).message}`);
    }

    return { imported, errors };
  },
};
