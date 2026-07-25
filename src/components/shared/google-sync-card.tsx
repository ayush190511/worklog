'use client';

import React, { useState } from 'react';
import {
  Cloud, CloudUpload, CloudDownload, RefreshCw, LogOut, Key, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSyncStore } from '@/stores/use-sync-store';
import { googleDriveSync } from '@/lib/sync/google-drive-sync';
import { formatRelativeTime } from '@/lib/utils/helpers';

export function GoogleSyncCard() {
  const {
    isLoggedIn,
    user,
    isSyncing,
    lastSyncedAt,
    clientId,
    autoSync,
    setClientId,
    setAutoSync,
    setLoggedOut,
  } = useSyncStore();

  const [inputClientId, setInputClientId] = useState(clientId);
  const [showKeyInput, setShowKeyInput] = useState(!clientId);

  const handleSaveClientId = () => {
    setClientId(inputClientId.trim());
    setShowKeyInput(false);
  };

  const handleLogin = async () => {
    await googleDriveSync.login(inputClientId.trim());
  };

  const handlePush = async () => {
    await googleDriveSync.pushToDrive();
  };

  const handlePull = async () => {
    await googleDriveSync.pullFromDrive();
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Google Drive Cloud Sync</CardTitle>
              <CardDescription className="text-xs">
                Sync across devices with $0 server cost · Uses your own Google Drive
              </CardDescription>
            </div>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Security badge */}
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
          <span>
            Data is stored inside a private, hidden app folder in your personal Google Drive (<code className="font-mono text-[10px]">appDataFolder</code>). No server costs for host.
          </span>
        </div>

        {/* Connected user status */}
        {isLoggedIn && user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full border border-border" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {user.name[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={setLoggedOut} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                <LogOut className="mr-1 h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>

            {/* Sync actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" onClick={handlePush} disabled={isSyncing} className="gap-1.5">
                <CloudUpload className={`h-4 w-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePull} disabled={isSyncing} className="gap-1.5">
                <CloudDownload className="h-4 w-4" />
                Restore from Drive
              </Button>
              {lastSyncedAt && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Last synced {formatRelativeTime(new Date(lastSyncedAt))}
                </span>
              )}
            </div>

            {/* Auto sync toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-2.5 text-xs">
              <span>Automatic Background Sync</span>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Client ID Configuration */}
            {showKeyInput ? (
              <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-muted/20">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary" /> Google OAuth Client ID
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your Google OAuth Client ID..."
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button size="sm" onClick={handleSaveClientId} className="h-8 text-xs px-3">
                    Save
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  Create a free Web Client ID in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Google Cloud Console</a> with your site origin.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono text-[11px] truncate max-w-[240px]">ID: {clientId}</span>
                <button onClick={() => setShowKeyInput(true)} className="text-primary underline text-xs">
                  Edit Client ID
                </button>
              </div>
            )}

            {/* Sign in button */}
            <Button
              onClick={handleLogin}
              disabled={isSyncing || !clientId}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Cloud className="h-4 w-4" />
              Sign in with Google Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
