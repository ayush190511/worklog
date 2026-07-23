'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, Star, Pin, FileText, ImageIcon,
  SortAsc, SortDesc, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { projectRepository } from '@/lib/repositories/project.repository';
import { categoryRepository } from '@/lib/repositories/category.repository';
import { searchEngine } from '@/lib/search/search-engine';
import { formatRelativeTime, truncate } from '@/lib/utils/helpers';
import type { EntryWithRelations, Project, Category, SortField, SortOrder } from '@/types';

function EntriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get('project');
  const searchQuery = searchParams.get('q');

  const [entries, setEntries] = useState<EntryWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchQuery ?? '');
  const [selectedProject, setSelectedProject] = useState<string>(projectFilter ?? 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  const loadEntries = useCallback(async (reset = false) => {
    const offset = reset ? 0 : page * PAGE_SIZE;
    if (reset) setPage(0);

    setIsLoading(true);
    try {
      let result: EntryWithRelations[];

      if (search.trim()) {
        // Use Fuse.js search
        const searchResults = await searchEngine.search(search, 100);
        const entryIds = searchResults
          .filter((r) => r.type === 'entry')
          .map((r) => r.id);
        const allEntries = await Promise.all(
          entryIds.map((id) => entryRepository.getWithRelations(id))
        );
        result = allEntries.filter(Boolean) as EntryWithRelations[];
      } else {
        result = await entryRepository.list(
          {
            projectId: selectedProject !== 'all' ? selectedProject : undefined,
            categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          },
          sortBy,
          sortOrder,
          offset,
          PAGE_SIZE
        );
      }

      if (reset) {
        setEntries(result);
      } else {
        setEntries((prev) => [...prev, ...result]);
      }
      setHasMore(result.length === PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedProject, selectedCategory, sortBy, sortOrder, page]);

  useEffect(() => {
    const loadMeta = async () => {
      const [projs, cats] = await Promise.all([
        projectRepository.list(),
        categoryRepository.list(),
      ]);
      setProjects(projs);
      setCategories(cats);
    };
    loadMeta();
  }, []);

  useEffect(() => {
    loadEntries(true);
  }, [search, selectedProject, selectedCategory, sortBy, sortOrder]);

  const handleNewEntry = async () => {
    const entry = await entryRepository.create({
      projectId: selectedProject !== 'all' ? selectedProject : undefined,
    });
    router.push(`/entries/${entry.id}`);
  };

  const loadMore = () => {
    setPage((p) => p + 1);
    loadEntries(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entries</h1>
          <p className="text-sm text-muted-foreground">Your work log</p>
        </div>
        <Button onClick={handleNewEntry} size="sm">
          <Plus className="mr-1 h-4 w-4" /> New Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedProject} onValueChange={(v) => v && setSelectedProject(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Project">
                {selectedProject === 'all' ? "All Projects" : (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: projects.find(p => p.id === selectedProject)?.color }} />
                    {projects.find(p => p.id === selectedProject)?.name}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={(v) => v && setSelectedCategory(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category">
                {selectedCategory === 'all' ? "All Categories" : categories.find(c => c.id === selectedCategory)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="shrink-0"
          >
            {sortOrder === 'desc' ? (
              <SortDesc className="h-4 w-4" />
            ) : (
              <SortAsc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Entry list */}
      {isLoading && entries.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No entries match your search' : 'No entries yet'}
            </p>
            {!search && (
              <Button variant="outline" size="sm" onClick={handleNewEntry}>
                <Plus className="mr-1 h-3 w-3" /> Create Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => router.push(`/entries/${entry.id}`)}
              className="flex w-full items-start gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all hover:border-border hover:bg-accent/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {entry.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                  {entry.favorite && <Star className="h-3 w-3 shrink-0 fill-yellow-500 text-yellow-500" />}
                  <span className="truncate text-sm font-medium">
                    {entry.title || 'Untitled'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {entry.project && (
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.project.color }}
                      />
                      {entry.project.name}
                    </span>
                  )}
                  {entry.category && <span>· {entry.category.name}</span>}
                  {entry.tags.length > 0 && (
                    <span>· {entry.tags.map((t) => t.name).join(', ')}</span>
                  )}
                  {entry.imageCount > 0 && (
                    <span className="flex items-center gap-0.5">
                      · <ImageIcon className="h-3 w-3" /> {entry.imageCount}
                    </span>
                  )}
                </div>
                {entry.content && (
                  <p className="mt-1 text-xs text-muted-foreground/60 line-clamp-1">
                    {truncate(entry.content, 150)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(entry.createdAt)}
              </span>
            </button>
          ))}

          {hasMore && !search && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    }>
      <EntriesContent />
    </Suspense>
  );
}
