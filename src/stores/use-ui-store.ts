// ============================================================
// UI Store — Sidebar, command palette, lightbox state
// ============================================================

import { create } from 'zustand';
import type { ImageRecord } from '@/types';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  lightboxOpen: boolean;
  lightboxImages: ImageRecord[];
  lightboxIndex: number;
  isMobile: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openLightbox: (images: ImageRecord[], index: number) => void;
  closeLightbox: () => void;
  setLightboxIndex: (index: number) => void;
  setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  lightboxOpen: false,
  lightboxImages: [],
  lightboxIndex: 0,
  isMobile: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openLightbox: (images, index) => set({ lightboxOpen: true, lightboxImages: images, lightboxIndex: index }),
  closeLightbox: () => set({ lightboxOpen: false, lightboxImages: [], lightboxIndex: 0 }),
  setLightboxIndex: (index) => set({ lightboxIndex: index }),
  setIsMobile: (isMobile) => set({ isMobile }),
}));
