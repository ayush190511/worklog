// ============================================================
// Google Drive Sync Engine (AppData Folder - $0 Host Cost)
// ============================================================

import { db } from '@/lib/db/database';
import { useSyncStore } from '@/stores/use-sync-store';
import { toast } from 'sonner';

const BACKUP_FILENAME = 'worklog_backup.json';
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const USERINFO_SCOPE = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

/** Ensure Google Identity Services script is loaded */
export function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export const googleDriveSync = {
  /** Trigger Google OAuth Login popup */
  async login(customClientId?: string): Promise<boolean> {
    try {
      await loadGsiScript();
      const clientId = customClientId || useSyncStore.getState().clientId;

      if (!clientId) {
        toast.error('Google Client ID is required. Please set it in Settings.');
        return false;
      }

      return new Promise((resolve) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: `${DRIVE_APPDATA_SCOPE} ${USERINFO_SCOPE}`,
          callback: async (res) => {
            if (res.error || !res.access_token) {
              toast.error(`Login failed: ${res.error || 'No access token'}`);
              resolve(false);
              return;
            }

            const token = res.access_token;
            const expiresIn = res.expires_in || 3600;

            // Fetch user info
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
              });
              const userData = await userRes.json();

              useSyncStore.getState().setLoggedIn(
                {
                  name: userData.name || userData.email || 'Google User',
                  email: userData.email || '',
                  picture: userData.picture || '',
                },
                token,
                expiresIn
              );

              toast.success(`Signed in as ${userData.name || userData.email}`);
              // Initial sync
              await this.pushToDrive();
              resolve(true);
            } catch (err) {
              console.error(err);
              toast.error('Failed to fetch Google profile info');
              resolve(false);
            }
          },
        });

        client.requestAccessToken();
      });
    } catch (error) {
      console.error(error);
      toast.error('Could not initialize Google Login');
      return false;
    }
  },

  /** Push local IndexedDB data to Google Drive appDataFolder */
  async pushToDrive(): Promise<boolean> {
    const { accessToken, isLoggedIn, setSyncing, setLastSyncedNow } = useSyncStore.getState();
    if (!isLoggedIn || !accessToken) return false;

    setSyncing(true);
    try {
      // 1. Export local database tables
      const [entries, projects, categories, tags, entryTags, settings] = await Promise.all([
        db.entries.toArray(),
        db.projects.toArray(),
        db.categories.toArray(),
        db.tags.toArray(),
        db.entryTags.toArray(),
        db.settings.toArray(),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        data: { entries, projects, categories, tags, entryTags, settings },
      };

      // 2. Find existing backup file in appDataFolder
      const fileId = await this.findBackupFileId(accessToken);

      const fileContent = JSON.stringify(payload);
      const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
        parents: fileId ? undefined : ['appDataFolder'],
      };

      const multipartBody = this.createMultipartBody(metadata, fileContent);

      const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

      const method = fileId ? 'PATCH' : 'POST';

      const uploadRes = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=foo_bar_baz`,
        },
        body: multipartBody,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Drive upload failed: ${uploadRes.status} ${errText}`);
      }

      setLastSyncedNow();
      toast.success('Successfully synced to Google Drive');
      return true;
    } catch (err) {
      console.error('Push to Drive failed:', err);
      toast.error('Google Drive sync failed. Please re-authenticate if expired.');
      return false;
    } finally {
      setSyncing(false);
    }
  },

  /** Pull remote data from Google Drive appDataFolder to local IndexedDB */
  async pullFromDrive(): Promise<boolean> {
    const { accessToken, isLoggedIn, setSyncing, setLastSyncedNow } = useSyncStore.getState();
    if (!isLoggedIn || !accessToken) return false;

    setSyncing(true);
    try {
      const fileId = await this.findBackupFileId(accessToken);
      if (!fileId) {
        toast.info('No backup found on Google Drive yet.');
        return false;
      }

      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to download backup file');

      const payload = await res.json();
      if (!payload.data) throw new Error('Invalid backup structure');

      const { entries, projects, categories, tags, entryTags } = payload.data;

      // Populate IndexedDB
      await db.transaction('rw', [db.entries, db.projects, db.categories, db.tags, db.entryTags], async () => {
        if (entries?.length) await db.entries.bulkPut(entries);
        if (projects?.length) await db.projects.bulkPut(projects);
        if (categories?.length) await db.categories.bulkPut(categories);
        if (tags?.length) await db.tags.bulkPut(tags);
        if (entryTags?.length) await db.entryTags.bulkPut(entryTags);
      });

      setLastSyncedNow();
      toast.success('Restored data from Google Drive');
      return true;
    } catch (err) {
      console.error('Pull from Drive failed:', err);
      toast.error('Failed to restore from Google Drive');
      return false;
    } finally {
      setSyncing(false);
    }
  },

  /** Find existing backup file ID in appDataFolder */
  async findBackupFileId(token: string): Promise<string | null> {
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}' and trashed=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    return listData.files?.[0]?.id || null;
  },

  /** Helper to construct multipart payload */
  createMultipartBody(metadata: object, content: string): string {
    const boundary = 'foo_bar_baz';
    return (
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`
    );
  },
};
