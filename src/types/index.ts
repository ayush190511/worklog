// ============================================================
// Work Log — Core Type Definitions
// ============================================================

/** Base fields shared by all entities */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Projects ----

export interface Project extends BaseEntity {
  name: string;
  color: string;
  icon: string;
  archived: boolean;
  visibility: 'private';
}

export type CreateProjectInput = Pick<Project, 'name' | 'color' | 'icon'>;
export type UpdateProjectInput = Partial<Pick<Project, 'name' | 'color' | 'icon' | 'archived'>>;

// ---- Categories ----

export interface Category extends BaseEntity {
  name: string;
  color: string;
}

export type CreateCategoryInput = Pick<Category, 'name' | 'color'>;
export type UpdateCategoryInput = Partial<Pick<Category, 'name' | 'color'>>;

// ---- Tags ----

export interface Tag extends BaseEntity {
  name: string;
  color: string;
}

export type CreateTagInput = Pick<Tag, 'name' | 'color'>;

// ---- Entries ----

export interface Entry extends BaseEntity {
  projectId: string | null;
  title: string;
  content: string;
  categoryId: string | null;
  favorite: boolean;
  pinned: boolean;
  visibility: 'private';
  deletedAt: Date | null;
}

export type CreateEntryInput = Partial<Pick<Entry, 'projectId' | 'title' | 'content' | 'categoryId'>>;
export type UpdateEntryInput = Partial<Pick<Entry, 'projectId' | 'title' | 'content' | 'categoryId' | 'favorite' | 'pinned' | 'deletedAt'>>;

/** Entry with resolved relations for display */
export interface EntryWithRelations extends Entry {
  project?: Project | null;
  category?: Category | null;
  tags: Tag[];
  imageCount: number;
  documentCount: number;
}

// ---- EntryTags (junction) ----

export interface EntryTag {
  id: string;
  entryId: string;
  tagId: string;
  createdAt: Date;
}

// ---- Images ----

export interface ImageRecord {
  id: string;
  entryId: string;
  name: string;
  mimeType: string;
  data: Blob;
  size: number;
  createdAt: Date;
}

// ---- Documents ----

export interface DocumentRecord {
  id: string;
  entryId: string;
  name: string;
  mimeType: string;
  data: Blob;
  size: number;
  createdAt: Date;
}

// ---- Version History ----

export interface VersionRecord {
  id: string;
  entryId: string;
  title: string;
  content: string;
  categoryId: string | null;
  projectId: string | null;
  version: number;
  createdAt: Date;
}

// ---- Trash ----

export interface TrashRecord {
  id: string;
  entityType: 'entry' | 'project';
  entityId: string;
  entityData: Record<string, unknown>;
  deletedAt: Date;
  expiresAt: Date;
}

// ---- Settings ----

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  id: string;
  theme: ThemeMode;
  keyboardShortcuts: Record<string, string>;
  updatedAt: Date;
}

// ---- Search ----

export interface SearchResult {
  id: string;
  type: 'entry' | 'project';
  title: string;
  snippet: string;
  projectName?: string;
  categoryName?: string;
  date: Date;
  score: number;
}

// ---- Filters ----

export interface EntryFilters {
  projectId?: string | null;
  categoryId?: string | null;
  tagId?: string | null;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  favoritesOnly?: boolean;
  pinnedOnly?: boolean;
}

export type SortField = 'createdAt' | 'updatedAt' | 'title';
export type SortOrder = 'asc' | 'desc';

// ---- Timeline ----

export type TimelineMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface TimelineGroup {
  label: string;
  date: Date;
  entries: EntryWithRelations[];
}

// ---- Statistics ----

export interface AppStats {
  totalEntries: number;
  totalProjects: number;
  totalCategories: number;
  totalTags: number;
  thisWeekEntries: number;
  storageUsed: number;
  storageQuota: number;
}

export interface ActivityDay {
  date: string;    // YYYY-MM-DD
  count: number;
}
