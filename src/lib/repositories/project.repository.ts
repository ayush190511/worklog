// ============================================================
// Project Repository
// ============================================================

import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';

export const projectRepository = {
  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: uuidv4(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      archived: false,
      visibility: 'private',
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(project);
    return project;
  },

  async getById(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  async list(includeArchived = false): Promise<Project[]> {
    if (includeArchived) {
      return db.projects.orderBy('name').toArray();
    }
    return db.projects.filter((p) => !p.archived).sortBy('name');
  },

  async update(id: string, changes: UpdateProjectInput): Promise<void> {
    await db.projects.update(id, { ...changes, updatedAt: new Date() });
  },

  async archive(id: string): Promise<void> {
    await db.projects.update(id, { archived: true, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    // Unlink entries from this project
    const entries = await db.entries.where('projectId').equals(id).toArray();
    for (const entry of entries) {
      await db.entries.update(entry.id, { projectId: null, updatedAt: new Date() });
    }
    await db.projects.delete(id);
  },

  async count(): Promise<number> {
    return db.projects.filter((p) => !p.archived).count();
  },

  /** Get entry counts per project */
  async getEntryCounts(): Promise<Record<string, number>> {
    const entries = await db.entries.filter((e) => e.deletedAt === null).toArray();
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.projectId) {
        counts[entry.projectId] = (counts[entry.projectId] ?? 0) + 1;
      }
    }
    return counts;
  },
};
