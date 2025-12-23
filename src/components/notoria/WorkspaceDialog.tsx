import { useState, useEffect } from 'react';
import { Workspace } from '@/lib/db';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Briefcase,
  Lightbulb,
  Folder,
  Hash,
  Star,
  Heart,
  Home,
  Book,
  Music,
  Camera,
  Palette,
  Globe,
  Zap,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKSPACE_ICONS = [
  { id: 'user', icon: User, label: 'User' },
  { id: 'briefcase', icon: Briefcase, label: 'Work' },
  { id: 'lightbulb', icon: Lightbulb, label: 'Ideas' },
  { id: 'folder', icon: Folder, label: 'Folder' },
  { id: 'hash', icon: Hash, label: 'Tag' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'heart', icon: Heart, label: 'Heart' },
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'book', icon: Book, label: 'Book' },
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'camera', icon: Camera, label: 'Camera' },
  { id: 'palette', icon: Palette, label: 'Art' },
  { id: 'globe', icon: Globe, label: 'Travel' },
  { id: 'zap', icon: Zap, label: 'Energy' },
  { id: 'target', icon: Target, label: 'Goals' },
  { id: 'trophy', icon: Trophy, label: 'Wins' },
];

const WORKSPACE_COLORS = [
  { name: 'Gold', value: '#C4A052' },
  { name: 'Slate', value: '#64748B' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
];

interface WorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace?: Workspace | null;
  onSave: (name: string, color: string, icon: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function WorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  onSave,
  onDelete,
}: WorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0].value);
  const [icon, setIcon] = useState('folder');
  const [saving, setSaving] = useState(false);

  const isEditing = !!workspace;

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setColor(workspace.color);
      setIcon(workspace.icon);
    } else {
      setName('');
      setColor(WORKSPACE_COLORS[0].value);
      setIcon('folder');
    }
  }, [workspace, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), color, icon);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (workspace && onDelete) {
      await onDelete(workspace.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? 'Edit Workspace' : 'New Workspace'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-foreground">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="bg-background border-border"
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-foreground">Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label className="text-foreground">Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {WORKSPACE_ICONS.map((i) => {
                const IconComponent = i.icon;
                return (
                  <button
                    key={i.id}
                    onClick={() => setIcon(i.id)}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                      icon === i.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                    )}
                    title={i.label}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-foreground">Preview</Label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              {(() => {
                const IconComp = WORKSPACE_ICONS.find(i => i.id === icon)?.icon || Folder;
                return <IconComp className="w-5 h-5" style={{ color }} />;
              })()}
              <span className="font-medium text-foreground">{name || 'Workspace Name'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
