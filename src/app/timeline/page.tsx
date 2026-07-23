'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Star, Pin, ImageIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/db/database';
import { entryRepository } from '@/lib/repositories/entry.repository';
import {
  formatDate,
  formatShortDate,
  formatTime,
  formatRelativeTime,
  truncate,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from '@/lib/utils/helpers';
import type { EntryWithRelations, TimelineMode, TimelineGroup } from '@/types';

export default function TimelinePage() {
  const router = useRouter();
  const [mode, setMode] = useState<TimelineMode>('daily');
  const [groups, setGroups] = useState<TimelineGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursorDate, setCursorDate] = useState<Date>(new Date());
  const observerRef = useRef<HTMLDivElement>(null);
  const BATCH_SIZE = 5; // Number of groups to load at once

  const loadGroups = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const date = reset ? new Date() : cursorDate;

      // Get all non-deleted entries ordered by createdAt desc
      const entries = await entryRepository.list(
        {},
        'createdAt',
        'desc',
        0,
        10000 // Load all for grouping
      );

      if (entries.length === 0) {
        setGroups([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      // Group entries by the selected mode
      const grouped = groupEntries(entries, mode);

      // Paginate groups
      const endDate = reset ? new Date() : cursorDate;
      const relevantGroups = grouped.filter((g) => g.date <= endDate);
      const pagedGroups = relevantGroups.slice(0, reset ? BATCH_SIZE : groups.length + BATCH_SIZE);

      setGroups(pagedGroups);
      setHasMore(pagedGroups.length < relevantGroups.length);

      if (pagedGroups.length > 0) {
        const lastGroup = pagedGroups[pagedGroups.length - 1];
        setCursorDate(new Date(lastGroup.date.getTime() - 1));
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, cursorDate, groups.length]);

  useEffect(() => {
    loadGroups(true);
  }, [mode]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadGroups(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadGroups]);

  // Navigate to a specific date
  const jumpToToday = () => {
    setCursorDate(new Date());
    loadGroups(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">Your work, organized by time</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={jumpToToday}>
            Today
          </Button>
          <Tabs value={mode} onValueChange={(v) => setMode(v as TimelineMode)}>
            <TabsList>
              <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Timeline */}
      {isLoading && groups.length === 0 ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No entries yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border sm:left-[19px]" />

          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.label} className="relative">
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background sm:h-10 sm:w-10">
                    <Calendar className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{group.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                </div>

                {/* Entries for this date */}
                <div className="ml-[30px] space-y-1 sm:ml-[38px]">
                  {group.entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => router.push(`/entries/${entry.id}`)}
                      className="flex w-full items-start gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all hover:border-border hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(entry.createdAt)}
                          </span>
                          {entry.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                          {entry.favorite && <Star className="h-3 w-3 shrink-0 fill-yellow-500 text-yellow-500" />}
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
                            <span className="flex items-center gap-0.5">
                              · <ImageIcon className="h-3 w-3" /> {entry.imageCount}
                            </span>
                          )}
                        </div>
                        {entry.content && (
                          <p className="mt-1 text-xs text-muted-foreground/60 line-clamp-1">
                            {truncate(entry.content, 120)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={observerRef} className="flex justify-center py-8">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading more...
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => loadGroups(false)}>
                  Load More
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Group entries by timeline mode */
function groupEntries(entries: EntryWithRelations[], mode: TimelineMode): TimelineGroup[] {
  const groupMap = new Map<string, { label: string; date: Date; entries: EntryWithRelations[] }>();

  for (const entry of entries) {
    const date = entry.createdAt;
    let key: string;
    let label: string;
    let groupDate: Date;

    switch (mode) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        label = formatDate(date);
        groupDate = startOfDay(date);
        break;
      case 'weekly': {
        const weekStart = startOfWeek(date);
        key = weekStart.toISOString().split('T')[0];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        label = `${formatShortDate(weekStart)} — ${formatShortDate(weekEnd)}`;
        groupDate = weekStart;
        break;
      }
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        groupDate = startOfMonth(date);
        break;
      case 'yearly':
        key = String(date.getFullYear());
        label = String(date.getFullYear());
        groupDate = startOfYear(date);
        break;
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, { label, date: groupDate, entries: [] });
    }
    groupMap.get(key)!.entries.push(entry);
  }

  // Sort groups by date descending
  return Array.from(groupMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}
