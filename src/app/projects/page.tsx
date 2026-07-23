'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, MoreHorizontal, Archive, Trash2, Edit3,
  FolderKanban,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { projectRepository } from '@/lib/repositories/project.repository';
import { PROJECT_COLORS, PROJECT_ICONS } from '@/lib/utils/helpers';
import type { Project } from '@/types';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);

  const loadProjects = async () => {
    setIsLoading(true);
    const [projs, cnts] = await Promise.all([
      projectRepository.list(true),
      projectRepository.getEntryCounts(),
    ]);
    setProjects(projs);
    setCounts(cnts);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editingProject) {
      await projectRepository.update(editingProject.id, { name: name.trim(), color, icon });
      toast.success('Project updated');
    } else {
      await projectRepository.create({ name: name.trim(), color, icon });
      toast.success('Project created');
    }

    setDialogOpen(false);
    resetForm();
    loadProjects();
  };

  const handleArchive = async (id: string) => {
    await projectRepository.archive(id);
    toast.success('Project archived');
    loadProjects();
  };

  const handleDelete = async (id: string) => {
    await projectRepository.delete(id);
    toast.success('Project deleted');
    loadProjects();
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setColor(project.color);
    setIcon(project.icon);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setColor(PROJECT_COLORS[0]);
    setIcon(PROJECT_ICONS[0]);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Organize your work</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger render={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Project
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  className="mt-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  autoFocus
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!name.trim()}>
                {editingProject ? 'Update' : 'Create'} Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No projects yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                project.archived ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: project.color + '20' }}
                >
                  <FolderKanban className="h-5 w-5" style={{ color: project.color }} />
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/entries?project=${project.id}`)}
                >
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {counts[project.id] ?? 0} entries
                    {project.archived && ' · Archived'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(project)}>
                      <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(project.id)}>
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(project.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
