'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { BottomNav } from './bottom-nav';
import { CommandPalette } from '@/components/shared/command-palette';
import { ImageLightbox } from '@/components/shared/image-lightbox';
import { useUIStore } from '@/stores/use-ui-store';
import { useSettingsStore } from '@/stores/use-settings-store';
import { seedDatabase } from '@/lib/db/seed';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const isMobile = useUIStore((s) => s.isMobile);
  const setIsMobile = useUIStore((s) => s.setIsMobile);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const pathname = usePathname();

  // Initialize app
  useEffect(() => {
    const init = async () => {
      await seedDatabase();
      await loadSettings();
      // Purge expired trash on startup
      await entryRepository.purgeExpiredTrash();
    };
    init();
  }, [loadSettings]);

  // Handle responsive
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile, setSidebarOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile, setSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 flex-1 w-full">
            {children}
          </div>
          <footer className="w-full border-t border-border py-4 mt-auto">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} Work Log. All data stays local.</p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Offline Ready</span>
                <span>v0.1.0</span>
              </div>
            </div>
          </footer>
        </main>
        {isMobile && <BottomNav />}
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <ImageLightbox />
    </div>
  );
}
