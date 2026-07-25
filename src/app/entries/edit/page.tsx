'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Star, Pin, Trash2, Check, Clock,
  ImageIcon, Paperclip, X, Download, History,
  ChevronDown, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { projectRepository } from '@/lib/repositories/project.repository';
import { categoryRepository } from '@/lib/repositories/category.repository';
import { tagRepository } from '@/lib/repositories/tag.repository';
import { imageRepository } from '@/lib/repositories/image.repository';
import { documentRepository } from '@/lib/repositories/document.repository';
import { searchEngine } from '@/lib/search/search-engine';
import { useUIStore } from '@/stores/use-ui-store';
import { formatRelativeTime, formatFileSize, formatDate } from '@/lib/utils/helpers';
import { PROJECT_COLORS } from '@/lib/utils/helpers';
import type {
  Entry, Project, Category, Tag, ImageRecord,
  DocumentRecord, VersionRecord,
} from '@/types';
import { toast } from 'sonner';

function EntryEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('id') as string;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [entryTags, setEntryTags] = useState<Tag[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showVersions, setShowVersions] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const openLightbox = useUIStore((s) => s.openLightbox);

  // Load entry and metadata
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [e, projs, cats, tags] = await Promise.all([
        entryRepository.getById(entryId),
        projectRepository.list(),
        categoryRepository.list(),
        tagRepository.list(),
      ]);

      if (!e) {
        router.push('/entries');
        return;
      }

      setEntry(e);
      setProjects(projs);
      setCategories(cats);
      setAllTags(tags);

      const [eTags, imgs, docs, vers] = await Promise.all([
        tagRepository.getTagsForEntry(entryId),
        imageRepository.getByEntryId(entryId),
        documentRepository.getByEntryId(entryId),
        entryRepository.getVersions(entryId),
      ]);

      setEntryTags(eTags);
      setImages(imgs);
      setDocuments(docs);
      setVersions(vers);

      // Create object URLs
      const urls: Record<string, string> = {};
      for (const img of imgs) {
        urls[img.id] = URL.createObjectURL(img.data);
      }
      setImageUrls(urls);
      setIsLoading(false);
    };
    load();

    return () => {
      Object.values(imageUrls).forEach(URL.revokeObjectURL);
    };
  }, [entryId]);

  // Handle Backspace shortcut to navigate back when focus is outside text inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;

      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (!isInput) {
        e.preventDefault();
        router.back();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Auto-save with debounce
  const autoSave = useCallback(
    (field: string, value: string | null) => {
      if (!entry) return;

      // Update local state immediately
      setEntry((prev) => (prev ? { ...prev, [field]: value } : prev));
      setSaveStatus('saving');

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        await entryRepository.update(entryId, { [field]: value } as Record<string, unknown>);
        searchEngine.invalidate();
        setSaveStatus('saved');

        // Refresh versions
        const vers = await entryRepository.getVersions(entryId);
        setVersions(vers);

        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    },
    [entry, entryId]
  );

  // Content change handler
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    autoSave('content', e.target.value);
  };

  const handleToggleFavorite = async () => {
    if (!entry) return;
    const newVal = await entryRepository.toggleFavorite(entryId);
    setEntry((prev) => (prev ? { ...prev, favorite: newVal } : prev));
  };

  const handleTogglePin = async () => {
    if (!entry) return;
    const newVal = await entryRepository.togglePin(entryId);
    setEntry((prev) => (prev ? { ...prev, pinned: newVal } : prev));
  };

  const handleDelete = async () => {
    await entryRepository.softDelete(entryId);
    searchEngine.invalidate();
    toast.success('Entry moved to trash');
    router.push('/entries');
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newImages = await imageRepository.addMultiple(entryId, files);
    setImages((prev) => [...prev, ...newImages]);

    const newUrls = { ...imageUrls };
    for (const img of newImages) {
      newUrls[img.id] = URL.createObjectURL(img.data);
    }
    setImageUrls(newUrls);
    e.target.value = '';
  };

  const handleImageDelete = async (id: string) => {
    await imageRepository.delete(id);
    if (imageUrls[id]) URL.revokeObjectURL(imageUrls[id]);
    setImages((prev) => prev.filter((i) => i.id !== id));
    const newUrls = { ...imageUrls };
    delete newUrls[id];
    setImageUrls(newUrls);
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const doc = await documentRepository.add(entryId, file);
      setDocuments((prev) => [...prev, doc]);
    }
    e.target.value = '';
  };

  const handleFileDelete = async (id: string) => {
    await documentRepository.delete(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleFileDownload = async (id: string) => {
    const doc = await documentRepository.getById(id);
    if (doc) documentRepository.download(doc);
  };

  // Tags
  const handleAddTag = async (tagId: string) => {
    await tagRepository.addToEntry(entryId, tagId);
    const tag = allTags.find((t) => t.id === tagId);
    if (tag && !entryTags.find((t) => t.id === tagId)) {
      setEntryTags((prev) => [...prev, tag]);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    await tagRepository.removeFromEntry(entryId, tagId);
    setEntryTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    const tag = await tagRepository.create({ name: newTagName.trim(), color: randomColor });
    setAllTags((prev) => [...prev, tag]);
    await tagRepository.addToEntry(entryId, tag.id);
    setEntryTags((prev) => [...prev, tag]);
    setNewTagName('');
  };

  // Version restore
  const handleRestoreVersion = async (versionId: string) => {
    await entryRepository.restoreVersion(entryId, versionId);
    const updated = await entryRepository.getById(entryId);
    if (updated) {
      setEntry(updated);
      toast.success('Version restored');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="space-y-4">
      {/* Sticky Top Bar & Meta Bar Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-3 pt-1 space-y-3 border-b border-border/50 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {/* Top controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-1.5">
            {/* Save status */}
            <span className="mr-2 text-xs text-muted-foreground">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-green-500">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className="h-8 w-8"
            >
              <Star
                className={`h-4 w-4 ${entry.favorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTogglePin}
              className="h-8 w-8"
            >
              <Pin
                className={`h-4 w-4 ${entry.pinned ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

      {/* Meta bar: Project, Category, Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={entry.projectId ?? 'none'}
          onValueChange={(v) => v && autoSave('projectId', v === 'none' ? null : v)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
            <SelectValue placeholder="Select project">
              {entry.projectId && entry.projectId !== 'none' ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: projects.find(p => p.id === entry.projectId)?.color }} />
                  {projects.find(p => p.id === entry.projectId)?.name}
                </span>
              ) : "No Project"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entry.categoryId ?? 'none'}
          onValueChange={(v) => v && autoSave('categoryId', v === 'none' ? null : v)}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Select category">
              {entry.categoryId && entry.categoryId !== 'none' ? categories.find(c => c.id === entry.categoryId)?.name : "No Category"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1">
          {entryTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 text-xs"
              style={{ borderColor: tag.color + '40' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                <Plus className="h-3 w-3 mr-0.5" /> Tag
              </Button>
            } />
            <PopoverContent className="w-52 p-2" align="start">
              <div className="space-y-2">
                <div className="flex gap-1">
                  <Input
                    placeholder="New tag..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTag();
                    }}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" className="h-7 px-2" onClick={handleCreateTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {allTags
                    .filter((t) => !entryTags.find((et) => et.id === t.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddTag(tag.id)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </button>
                    ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      </div>

      {/* Title */}
      <input
        ref={titleRef}
        type="text"
        value={entry.title}
        onChange={(e) => autoSave('title', e.target.value)}
        placeholder="Entry title..."
        className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
      />

      {/* Content */}
      <textarea
        ref={contentRef}
        value={entry.content}
        onChange={handleContentChange}
        placeholder="What did you work on..."
        className="w-full h-64 sm:h-72 rounded-xl border border-border/60 bg-muted/20 p-3.5 text-sm leading-relaxed outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 overflow-y-auto resize-none custom-scrollbar placeholder:text-muted-foreground/40"
      />

      <Separator />

      {/* Attachments */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent">
              <ImageIcon className="h-3.5 w-3.5" /> Add Images
            </span>
          </label>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent">
              <Paperclip className="h-3.5 w-3.5" /> Add Files
            </span>
          </label>
        </div>

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img, idx) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => openLightbox(images, idx)}
                  className="h-full w-full"
                >
                  {imageUrls[img.id] && (
                    <img
                      src={imageUrls[img.id]}
                      alt={img.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </button>
                <button
                  onClick={() => handleImageDelete(img.id)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {formatFileSize(img.size)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Files list */}
        {documents.length > 0 && (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{doc.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleFileDownload(doc.id)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleFileDelete(doc.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="pt-2">
        <button
          onClick={() => setShowVersions(!showVersions)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-3.5 w-3.5" />
          Version History ({versions.length})
          <ChevronDown className={`h-3 w-3 transition-transform ${showVersions ? 'rotate-180' : ''}`} />
        </button>

        {showVersions && versions.length > 0 && (
          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex-1">
                  <span className="text-xs font-medium">v{v.version}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {v.title || 'Untitled'}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {formatRelativeTime(v.createdAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleRestoreVersion(v.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Created {formatDate(entry.createdAt)}
        </span>
        {entry.updatedAt > entry.createdAt && (
          <span>
            · Updated {formatRelativeTime(entry.updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function EntryEditorPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <EntryEditorContent />
    </Suspense>
  );
}
