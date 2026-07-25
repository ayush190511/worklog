// ============================================================
// Google Sync Zustand Store
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

interface SyncState {
  isLoggedIn: boolean;
  user: GoogleUser | null;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  clientId: string;
  autoSync: boolean;

  setLoggedIn: (user: GoogleUser, token: string, expiresInSeconds: number) => void;
  setLoggedOut: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncedNow: () => void;
  setClientId: (clientId: string) => void;
  setAutoSync: (autoSync: boolean) => void;
  isTokenExpired: () => boolean;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      accessToken: null,
      tokenExpiresAt: null,
      isSyncing: false,
      lastSyncedAt: null,
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      autoSync: true,

      setLoggedIn: (user, token, expiresInSeconds) => {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        set({
          isLoggedIn: true,
          user,
          accessToken: token,
          tokenExpiresAt: expiresAt,
        });
      },

      setLoggedOut: () => {
        set({
          isLoggedIn: false,
          user: null,
          accessToken: null,
          tokenExpiresAt: null,
          lastSyncedAt: null,
        });
      },

      setSyncing: (isSyncing) => set({ isSyncing }),

      setLastSyncedNow: () => set({ lastSyncedAt: new Date().toISOString() }),

      setClientId: (clientId) => set({ clientId }),

      setAutoSync: (autoSync) => set({ autoSync }),

      isTokenExpired: () => {
        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return true;
        return Date.now() >= tokenExpiresAt - 60000; // 1 min margin
      },
    }),
    {
      name: 'worklog-google-sync',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        accessToken: state.accessToken,
        tokenExpiresAt: state.tokenExpiresAt,
        lastSyncedAt: state.lastSyncedAt,
        clientId: state.clientId,
        autoSync: state.autoSync,
      }),
    }
  )
);
