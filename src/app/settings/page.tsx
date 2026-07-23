'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Sun, Moon, Monitor, Download, Upload, HardDrive,
  Keyboard, Trash2, AlertTriangle, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores/use-settings-store';
import { exportService } from '@/lib/export/export-service';
import { formatFileSize, getStorageEstimate } from '@/lib/utils/helpers';
import { db } from '@/lib/db/database';
import type { ThemeMode } from '@/types';
import { toast } from 'sonner';

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl/⌘', 'K'], description: 'Open Command Palette' },
  { keys: ['N'], description: 'New Entry' },
  { keys: ['/'], description: 'Focus Search' },
  { keys: ['Esc'], description: 'Close Dialogs' },
];

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [tableSizes, setTableSizes] = useState<Record<string, number>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadStorage = async () => {
      const est = await getStorageEstimate();
      setStorage(est);

      // Count records per table
      const [entries, projects, categories, tags, images, documents, versions, trash] = await Promise.all([
        db.entries.count(),
        db.projects.count(),
        db.categories.count(),
        db.tags.count(),
        db.images.count(),
        db.documents.count(),
        db.versionHistory.count(),
        db.trash.count(),
      ]);
      setTableSizes({
        Entries: entries,
        Projects: projects,
        Categories: categories,
        Tags: tags,
        Images: images,
        Documents: documents,
        'Version History': versions,
        Trash: trash,
      });
    };
    loadStorage();
  }, []);

  const handleExport = async () => {
    try {
      await exportService.exportAll();
      toast.success('Backup exported successfully');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await exportService.importFromFile(file);
      setImportResult(result);
      if (result.errors.length === 0) {
        toast.success(`Imported ${result.imported} items`);
      } else {
        toast.warning(`Imported ${result.imported} items with ${result.errors.length} errors`);
      }
    } catch (error) {
      toast.error('Import failed');
    }

    e.target.value = '';
  };

  const handleReset = async () => {
    await db.delete();
    setConfirmReset(false);
    window.location.reload();
  };

  const storagePercent = storage.quota > 0 ? Math.round((storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Appearance</CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: 'light' as ThemeMode, icon: Sun, label: 'Light' },
              { value: 'dark' as ThemeMode, icon: Moon, label: 'Dark' },
              { value: 'system' as ThemeMode, icon: Monitor, label: 'System' },
            ].map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={theme === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme(value)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export / Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Data</CardTitle>
          <CardDescription>Export and import your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export Backup (JSON)
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Backup
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Exports include all entries, projects, categories, tags, and version history.
              Images and documents are not included in exports due to file size.
            </p>
          </div>
          {importResult && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <p>Imported {importResult.imported} items</p>
              {importResult.errors.length > 0 && (
                <div className="mt-1 text-destructive">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <HardDrive className="h-4 w-4" />
            Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{formatFileSize(storage.usage)} used</span>
              <span className="text-muted-foreground">
                {storage.quota > 0 ? formatFileSize(storage.quota) : 'Unknown'} quota
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {Object.entries(tableSizes).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50"
              >
                <span className="text-sm">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <span className="text-xs text-muted-foreground">+</span>}
                      <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                        {key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset All Data</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete all data. This cannot be undone.
              </p>
            </div>
            <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
              <Button variant="destructive" size="sm" onClick={() => setConfirmReset(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Reset
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Reset All Data
                  </DialogTitle>
                  <DialogDescription>
                    This will permanently delete ALL your entries, projects, images, and settings.
                    Export a backup first if you want to keep your data.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleReset}>
                    Delete Everything
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
