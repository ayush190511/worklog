'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2, RotateCcw, AlertTriangle, FileText, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { trashRepository } from '@/lib/repositories/trash.repository';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { formatRelativeTime } from '@/lib/utils/helpers';
import type { TrashRecord, Entry } from '@/types';
import { toast } from 'sonner';

export default function TrashPage() {
  const router = useRouter();
  const [items, setItems] = useState<TrashRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const loadTrash = async () => {
    setIsLoading(true);
    const trash = await trashRepository.list();
    setItems(trash);
    setIsLoading(false);
  };

  useEffect(() => { loadTrash(); }, []);

  const handleRestore = async (item: TrashRecord) => {
    await entryRepository.restore(item.id);
    toast.success('Entry restored');
    loadTrash();
  };

  const handlePermanentDelete = async (item: TrashRecord) => {
    await trashRepository.permanentDelete(item.id);
    toast.success('Permanently deleted');
    loadTrash();
  };

  const handleEmptyTrash = async () => {
    await trashRepository.emptyTrash();
    toast.success('Trash emptied');
    setConfirmEmpty(false);
    loadTrash();
  };

  const getEntryData = (item: TrashRecord): Partial<Entry> => {
    return (item.entityData as { entry?: Partial<Entry> })?.entry ?? {};
  };

  const getDaysRemaining = (item: TrashRecord): number => {
    const now = new Date();
    const expires = new Date(item.expiresAt);
    return Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Items are automatically deleted after 60 days
          </p>
        </div>
        {items.length > 0 && (
          <Dialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
            <DialogTrigger render={
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" /> Empty Trash
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Empty Trash
                </DialogTitle>
                <DialogDescription>
                  This will permanently delete all {items.length} items. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setConfirmEmpty(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleEmptyTrash}>
                  Delete Forever
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Trash is empty</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const entry = getEntryData(item);
            const daysLeft = getDaysRemaining(item);

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 transition-all hover:border-border hover:bg-accent/50"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {(entry.title as string) || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Deleted {formatRelativeTime(new Date(item.deletedAt))}</span>
                    <span>· {daysLeft} days remaining</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleRestore(item)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handlePermanentDelete(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
