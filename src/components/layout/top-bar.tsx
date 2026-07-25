'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Menu, Moon, Sun, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/use-ui-store';
import { useSettingsStore } from '@/stores/use-settings-store';
import { useSyncStore } from '@/stores/use-sync-store';
import { googleDriveSync } from '@/lib/sync/google-drive-sync';
import { entryRepository } from '@/lib/repositories/entry.repository';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function TopBar() {
  const router = useRouter();
  const isMobile = useUIStore((s) => s.isMobile);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const isLoggedIn = useSyncStore((s) => s.isLoggedIn);
  const user = useSyncStore((s) => s.user);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const handleNewEntry = async () => {
    const entry = await entryRepository.create({});
    router.push(`/entries/edit?id=${entry.id}`);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSyncClick = async () => {
    if (isLoggedIn) {
      await googleDriveSync.pushToDrive();
    } else {
      router.push('/settings');
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Google Sync Button */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleSyncClick}
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative text-muted-foreground hover:text-foreground"
              >
                <Cloud className={`h-4 w-4 ${isLoggedIn ? 'text-blue-500 fill-blue-500/20' : ''}`} />
                {isSyncing && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                )}
              </Button>
            }
          />
          <TooltipContent>
            {isLoggedIn ? `Google Drive Synced (${user?.email}) - Click to sync now` : 'Google Drive Sync (Setup in Settings)'}
          </TooltipContent>
        </Tooltip>
        {/* Search / Command Palette */}
        <Tooltip>
          <TooltipTrigger
            onClick={openCommandPalette}
            render={
              <Button
                variant="outline"
                size="sm"
                className="hidden h-8 gap-2 px-3 text-xs text-muted-foreground sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
                <kbd className="pointer-events-none ml-2 hidden items-center gap-1 rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-muted-foreground sm:inline-flex">
                  <span>Ctrl</span>
                  <span className="opacity-60">+</span>
                  <span>K</span>
                </kbd>
              </Button>
            }
          />
          <TooltipContent>Command Palette</TooltipContent>
        </Tooltip>

        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon"
          onClick={openCommandPalette}
          className="h-8 w-8 sm:hidden"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* New Entry */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleNewEntry}
            render={
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>New Entry (N)</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleToggleTheme}
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            }
          />
          <TooltipContent>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
