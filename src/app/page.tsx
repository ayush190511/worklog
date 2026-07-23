'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, FolderKanban, TrendingUp, HardDrive,
  Plus, Search, Star, Pin, ImageIcon, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { projectRepository } from '@/lib/repositories/project.repository';
import { imageRepository } from '@/lib/repositories/image.repository';
import { searchEngine } from '@/lib/search/search-engine';
import { useUIStore } from '@/stores/use-ui-store';
import { formatRelativeTime, formatFileSize, getStorageEstimate, truncate } from '@/lib/utils/helpers';
import type { EntryWithRelations, Project, ImageRecord, SearchResult } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ entries: 0, projects: 0, thisWeek: 0, storage: '' });
  const [recentEntries, setRecentEntries] = useState<EntryWithRelations[]>([]);
  const [pinnedEntries, setPinnedEntries] = useState<EntryWithRelations[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<EntryWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const openLightbox = useUIStore((s) => s.openLightbox);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        entryCount,
        projectCount,
        weekCount,
        storageEst,
        recent,
        pinned,
        favs,
        projs,
        counts,
        imgs,
      ] = await Promise.all([
        entryRepository.count(),
        projectRepository.count(),
        entryRepository.countThisWeek(),
        getStorageEstimate(),
        entryRepository.getRecent(5),
        entryRepository.getPinned(),
        entryRepository.getFavorites(),
        projectRepository.list(),
        projectRepository.getEntryCounts(),
        imageRepository.getRecent(10),
      ]);

      setStats({
        entries: entryCount,
        projects: projectCount,
        thisWeek: weekCount,
        storage: formatFileSize(storageEst.usage),
      });
      setRecentEntries(recent);
      setPinnedEntries(pinned.slice(0, 5));
      setFavoriteEntries(favs.slice(0, 5));
      setProjects(projs);
      setProjectCounts(counts);
      setRecentImages(imgs);

      // Create object URLs for images
      const urls: Record<string, string> = {};
      for (const img of imgs) {
        urls[img.id] = URL.createObjectURL(img.data);
      }
      setImageUrls(urls);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup object URLs
      Object.values(imageUrls).forEach(URL.revokeObjectURL);
    };
  }, [loadData]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        entryRepository.create({}).then((entry) => {
          router.push(`/entries/edit?id=${entry.id}`);
        });
      }
      if (e.key === '/') {
        e.preventDefault();
        useUIStore.getState().openCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleNewEntry = async () => {
    const entry = await entryRepository.create({});
    router.push(`/entries/edit?id=${entry.id}`);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your professional work at a glance.</p>
      </div>

      {/* Quick Add */}
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5 cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/10"
        onClick={handleNewEntry}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">What did you work on?</p>
            <p className="text-xs text-muted-foreground">Click to start a new entry</p>
          </div>
          <kbd className="hidden sm:inline rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            N
          </kbd>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={FileText} label="Total Entries" value={stats.entries} />
        <StatCard icon={FolderKanban} label="Projects" value={stats.projects} />
        <StatCard icon={TrendingUp} label="This Week" value={stats.thisWeek} />
        <StatCard icon={HardDrive} label="Storage" value={stats.storage} isString />
      </div>

      {/* Pinned & Favorites */}
      <div className="grid gap-6 md:grid-cols-2">
        {pinnedEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Pin className="h-4 w-4 text-primary" />
                Pinned Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {pinnedEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/entries/${entry.id}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{entry.title || 'Untitled'}</span>
                  {entry.project && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {entry.project.name}
                    </span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {favoriteEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Star className="h-4 w-4 text-yellow-500" />
                Favorites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {favoriteEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/entries/${entry.id}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Star className="h-3 w-3 shrink-0 text-yellow-500" />
                  <span className="truncate">{entry.title || 'Untitled'}</span>
                  {entry.project && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {entry.project.name}
                    </span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Recent Entries</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push('/entries')} className="text-xs">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No entries yet</p>
              <Button variant="outline" size="sm" onClick={handleNewEntry}>
                <Plus className="mr-1 h-3 w-3" /> Create your first entry
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/entries/${entry.id}`)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                      {entry.favorite && <Star className="h-3 w-3 shrink-0 text-yellow-500" />}
                      <span className="truncate text-sm font-medium">
                        {entry.title || 'Untitled'}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
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
                      {entry.imageCount > 0 && (
                        <span>· {entry.imageCount} image{entry.imageCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {entry.content && (
                      <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
                        {truncate(entry.content, 120)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects & Recent Images */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/projects')} className="text-xs">
              Manage <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No projects yet
              </p>
            ) : (
              <div className="space-y-1">
                {projects.slice(0, 6).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/entries?project=${project.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {projectCounts[project.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Images */}
        {recentImages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4" />
                Recent Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {recentImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => openLightbox(recentImages, idx)}
                    className="aspect-square overflow-hidden rounded-lg border border-border transition-transform hover:scale-105"
                  >
                    {imageUrls[img.id] && (
                      <img
                        src={imageUrls[img.id]}
                        alt={img.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  isString,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  isString?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{isString ? value : value.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-60" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-60" />
    </div>
  );
}
