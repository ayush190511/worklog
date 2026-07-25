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
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold text-popover-foreground">{data.fullMonth || data.month}</p>
                            <p className="text-muted-foreground">{data.count} {data.count === 1 ? 'entry' : 'entries'}</p>
                          </div>
                        );
                      }
                      return null;
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

      {/* Activity heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Activity Heatmap
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

/** Enhanced activity grid with Month & Year headers, day labels, and legend */
function ActivityGrid({ data }: { data: { date: string; count: number }[] }) {
  const today = new Date();
  const grid: { date: string; count: number; dayOfWeek: number; month: number; year: number }[] = [];
  const dataMap = new Map(data.map((d) => [d.date, d.count]));

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    grid.push({
      date: key,
      count: dataMap.get(key) ?? 0,
      dayOfWeek: d.getDay(),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }

  const maxCount = Math.max(...grid.map((g) => g.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted/60 dark:bg-muted/40';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-emerald-500/30 dark:bg-emerald-500/25';
    if (intensity < 0.5) return 'bg-emerald-500/50 dark:bg-emerald-500/45';
    if (intensity < 0.75) return 'bg-emerald-500/75 dark:bg-emerald-500/70';
    return 'bg-emerald-500 dark:bg-emerald-400';
  };

  // Group by weeks
  const weeks: { days: typeof grid; monthLabel?: string }[] = [];
  let currentWeek: typeof grid = [];
  let lastMonth = -1;

  for (const day of grid) {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      const firstDay = currentWeek[0];
      let monthLabel: string | undefined = undefined;
      if (firstDay.month !== lastMonth) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthLabel = `${monthNames[firstDay.month]} '${String(firstDay.year).slice(2)}`;
        lastMonth = firstDay.month;
      }
      weeks.push({ days: currentWeek, monthLabel });
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    const firstDay = currentWeek[0];
    let monthLabel: string | undefined = undefined;
    if (firstDay.month !== lastMonth) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthLabel = `${monthNames[firstDay.month]} '${String(firstDay.year).slice(2)}`;
    }
    weeks.push({ days: currentWeek, monthLabel });
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="space-y-3 overflow-x-auto pb-2">
      <div className="inline-flex flex-col gap-1.5 min-w-[760px]">
        {/* Month & Year Headers */}
        <div className="flex pl-7 text-[11px] font-medium text-muted-foreground">
          {weeks.map((week, idx) => (
            <div key={idx} className="w-[15px] shrink-0 text-left overflow-visible whitespace-nowrap">
              {week.monthLabel ? (
                <span className="inline-block font-semibold text-foreground/90">{week.monthLabel}</span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Days & Heatmap Grid */}
        <div className="flex items-center gap-1.5">
          {/* Day of week labels */}
          <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground/70 font-mono select-none">
            {dayLabels.map((label, idx) => (
              <span key={idx} className="h-[12px] leading-[12px] text-right">
                {label}
              </span>
            ))}
          </div>

          {/* Grid columns */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.days.map((day) => {
                  const dateObj = new Date(day.date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <div
                      key={day.date}
                      className={`h-[12px] w-[12px] rounded-[3px] transition-transform hover:scale-125 hover:z-10 ${getColor(
                        day.count
                      )}`}
                      title={`${formattedDate}: ${day.count} ${day.count === 1 ? 'entry' : 'entries'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend & Stats */}
        <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
          <span className="text-[11px]">
            Showing activity for the past 365 days
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Less</span>
            <div className="h-3 w-3 rounded-[3px] bg-muted/60 dark:bg-muted/40" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-500/30 dark:bg-emerald-500/25" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-500/50 dark:bg-emerald-500/45" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-500/75 dark:bg-emerald-500/70" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-400" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMonthlyData(activity: { date: string; count: number }[]): { month: string; fullMonth: string; count: number }[] {
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
      month: `${d.toLocaleDateString('en-US', { month: 'short' })} '${year.slice(2)}`,
      fullMonth: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      count,
    };
  });
}
