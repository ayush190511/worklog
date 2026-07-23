// ============================================================
// Search Engine — Fuse.js integration
// ============================================================

import Fuse, { IFuseOptions } from 'fuse.js';
import { db } from '@/lib/db/database';
import type { SearchResult, Entry, Project } from '@/types';

interface SearchableEntry {
  id: string;
  type: 'entry';
  title: string;
  content: string;
  projectName: string;
  categoryName: string;
  date: Date;
}

interface SearchableProject {
  id: string;
  type: 'project';
  title: string;
  content: string;
  projectName: string;
  categoryName: string;
  date: Date;
}

type SearchableItem = SearchableEntry | SearchableProject;

let fuseInstance: Fuse<SearchableItem> | null = null;
let lastIndexTime = 0;
const INDEX_STALE_MS = 5000; // Re-index every 5 seconds at most

const fuseOptions: IFuseOptions<SearchableItem> = {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'content', weight: 1 },
    { name: 'projectName', weight: 2 },
    { name: 'categoryName', weight: 1.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

async function buildIndex(): Promise<Fuse<SearchableItem>> {
  const [entries, projects, categories] = await Promise.all([
    db.entries.filter((e) => e.deletedAt === null).toArray(),
    db.projects.toArray(),
    db.categories.toArray(),
  ]);

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const items: SearchableItem[] = [
    ...entries.map((e): SearchableEntry => ({
      id: e.id,
      type: 'entry',
      title: e.title,
      content: e.content,
      projectName: e.projectId ? (projectMap.get(e.projectId) ?? '') : '',
      categoryName: e.categoryId ? (categoryMap.get(e.categoryId) ?? '') : '',
      date: e.createdAt,
    })),
    ...projects.map((p): SearchableProject => ({
      id: p.id,
      type: 'project',
      title: p.name,
      content: '',
      projectName: p.name,
      categoryName: '',
      date: p.createdAt,
    })),
  ];

  fuseInstance = new Fuse(items, fuseOptions);
  lastIndexTime = Date.now();
  return fuseInstance;
}

export const searchEngine = {
  /** Search across entries and projects */
  async search(query: string, limit = 50): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    // Re-index if stale
    if (!fuseInstance || Date.now() - lastIndexTime > INDEX_STALE_MS) {
      await buildIndex();
    }

    const results = fuseInstance!.search(query, { limit });

    return results.map((r) => ({
      id: r.item.id,
      type: r.item.type,
      title: r.item.title,
      snippet: r.item.type === 'entry'
        ? (r.item.content || '').slice(0, 150)
        : '',
      projectName: r.item.projectName,
      categoryName: r.item.categoryName,
      date: r.item.date,
      score: r.score ?? 1,
    }));
  },

  /** Force re-index */
  async reindex(): Promise<void> {
    await buildIndex();
  },

  /** Invalidate cache */
  invalidate(): void {
    fuseInstance = null;
    lastIndexTime = 0;
  },
};
