'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  FolderKanban,
  Search,
  Settings,
  BarChart3,
  Calendar,
  Trash2,
  LayoutDashboard,
  Plus,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/use-ui-store';
import { entryRepository } from '@/lib/repositories/entry.repository';
import { searchEngine } from '@/lib/search/search-engine';
import type { SearchResult } from '@/types';

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchEngine.search(query, 10);
      setSearchResults(results);
    }, 100);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((action: string) => {
    close();
    setQuery('');

    switch (action) {
      case 'new-entry':
        entryRepository.create({}).then((entry) => {
          router.push(`/entries/edit?id=${entry.id}`);
        });
        break;
      case 'dashboard':
        router.push('/');
        break;
      case 'entries':
        router.push('/entries');
        break;
      case 'projects':
        router.push('/projects');
        break;
      case 'timeline':
        router.push('/timeline');
        break;
      case 'stats':
        router.push('/stats');
        break;
      case 'trash':
        router.push('/trash');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        if (action.startsWith('entry:')) {
          router.push(`/entries/edit?id=${action.slice(6)}`);
        } else if (action.startsWith('project:')) {
          router.push(`/projects`);
        }
    }
  }, [close, router]);

  return (
    <CommandDialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <CommandInput
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Search results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Search Results">
            {searchResults.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.title} ${result.snippet}`}
                onSelect={() =>
                  handleSelect(result.type === 'entry' ? `entry:${result.id}` : `project:${result.id}`)
                }
              >
                {result.type === 'entry' ? (
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm">{result.title || 'Untitled'}</span>
                  {result.snippet && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {result.snippet}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && (
          <>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleSelect('new-entry')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>New Entry</span>
                <kbd className="ml-auto rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                  N
                </kbd>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => handleSelect('dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('entries')}>
                <FileText className="mr-2 h-4 w-4" />
                Entries
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('projects')}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Projects
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('timeline')}>
                <Calendar className="mr-2 h-4 w-4" />
                Timeline
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('stats')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistics
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('trash')}>
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
