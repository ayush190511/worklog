'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Calendar,
  BarChart3,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/stores/use-ui-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/entries', icon: FileText, label: 'Entries' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/timeline', icon: Calendar, label: 'Timeline' },
  { href: '/stats', icon: BarChart3, label: 'Statistics' },
  { href: '/trash', icon: Trash2, label: 'Trash' },
];

const BOTTOM_ITEMS = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const isMobile = useUIStore((s) => s.isMobile);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        isMobile
          ? cn(
              'fixed inset-y-0 left-0 z-50',
              sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
            )
          : 'w-64'
      )}
    >
      {/* Logo area */}
      <div className={cn(
        'flex h-14 items-center border-b border-border px-4',
      )}>
        {(!isMobile || sidebarOpen) && (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">PM</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Professional Memory
            </span>
          </Link>
        )}
      </div>

      {/* Nav items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );

            return linkContent;
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-border p-2">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );

          return linkContent;
        })}
      </div>
    </aside>
  );
}
