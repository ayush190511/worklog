'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText, FolderKanban, Tag, Calendar, HardDrive,
  TrendingUp, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { projectRepository } from '@/lib/repositories/project.repository';
import { categoryRepository } from '@/lib/repositories/category.repository';
import { tagRepository } from '@/lib/repositories/tag.repository';
import { formatFileSize, getStorageEstimate } from '@/lib/utils/helpers';
import type { Project } from '@/types';

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#64748b',
];

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    entries: 0, projects: 0, categories: 0, tags: 0, thisWeek: 0,
  });
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [projectData, setProjectData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [
          entryCount, projectCount, categoryCount, tagCount, weekCount,
          storageEst, activity, projects, projectCounts,
        ] = await Promise.all([
          entryRepository.count(),
          projectRepository.count(),
          categoryRepository.count(),
          tagRepository.count(),
          entryRepository.countThisWeek(),
          getStorageEstimate(),
          entryRepository.getActivityData(),
          projectRepository.list(),
          projectRepository.getEntryCounts(),
        ]);

        setStats({
          entries: entryCount, projects: projectCount,
          categories: categoryCount, tags: tagCount, thisWeek: weekCount,
        });
        setStorage(storageEst);
        setActivityData(activity);

        // Pie chart data
        const pieData = projects
          .filter((p) => (projectCounts[p.id] ?? 0) > 0)
          .map((p) => ({
            name: p.name,
            value: projectCounts[p.id] ?? 0,
            color: p.color,
          }))
          .sort((a, b) => b.value - a.value);
        setProjectData(pieData);

        // Monthly bar chart (last 12 months)
        const monthly = buildMonthlyData(activity);
        setMonthlyData(monthly);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const storagePercent = storage.quota > 0 ? Math.round((storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
        <p className="text-sm text-muted-foreground">Your work in numbers</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <OverviewCard icon={FileText} label="Entries" value={stats.entries} />
        <OverviewCard icon={FolderKanban} label="Projects" value={stats.projects} />
        <OverviewCard icon={Tag} label="Categories" value={stats.categories} />
        <OverviewCard icon={Calendar} label="Tags" value={stats.tags} />
        <OverviewCard icon={TrendingUp} label="This Week" value={stats.thisWeek} />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly entries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Entries Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* By project */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FolderKanban className="h-4 w-4" />
              By Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={projectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {projectData.map((entry, idx) => (
                        <Cell key={entry.name} fill={entry.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {projectData.slice(0, 6).map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate flex-1">{p.name}</span>
                      <span className="text-muted-foreground">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No project data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity heatmap placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityData.length > 0 ? (
            <ActivityGrid data={activityData} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start creating entries to see your activity
            </p>
          )}
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{formatFileSize(storage.usage)} used</span>
              <span className="text-muted-foreground">
                {storage.quota > 0 ? `${formatFileSize(storage.quota)} quota` : 'Quota unknown'}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {storagePercent}% used · Data is stored locally in your browser
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{value.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** GitHub-style activity grid */
function ActivityGrid({ data }: { data: { date: string; count: number }[] }) {
  // Build a 52-week × 7-day grid
  const today = new Date();
  const grid: { date: string; count: number; dayOfWeek: number }[] = [];
  const dataMap = new Map(data.map((d) => [d.date, d.count]));

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    grid.push({
      date: key,
      count: dataMap.get(key) ?? 0,
      dayOfWeek: d.getDay(),
    });
  }

  const maxCount = Math.max(...grid.map((g) => g.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-primary/20';
    if (intensity < 0.5) return 'bg-primary/40';
    if (intensity < 0.75) return 'bg-primary/60';
    return 'bg-primary';
  };

  // Group by weeks
  const weeks: typeof grid[] = [];
  let currentWeek: typeof grid = [];
  for (const day of grid) {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-[700px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className={`h-[12px] w-[12px] rounded-[2px] ${getColor(day.count)}`}
                title={`${day.date}: ${day.count} entries`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildMonthlyData(activity: { date: string; count: number }[]): { month: string; count: number }[] {
  const months = new Map<string, number>();
  const now = new Date();

  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.set(key, 0);
  }

  // Aggregate
  for (const entry of activity) {
    const monthKey = entry.date.substring(0, 7);
    if (months.has(monthKey)) {
      months.set(monthKey, (months.get(monthKey) ?? 0) + entry.count);
    }
  }

  return Array.from(months.entries()).map(([key, count]) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      count,
    };
  });
}
