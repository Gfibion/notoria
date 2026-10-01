import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Folder } from 'lucide-react';
import { WORKSPACE_ICONS } from '@/lib/workspace-icons';

// Convert HSL to hex for storage
function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const v = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

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
  const [hue, setHue] = useState(45); // gold-ish default
  const [color, setColor] = useState(hslToHex(45, 55, 55));
  const [icon, setIcon] = useState('folder');
  const [saving, setSaving] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const isEditing = !!workspace;

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setColor(workspace.color);
      setIcon(workspace.icon);
    } else {
      setName('');
      setHue(45);
      setColor(hslToHex(45, 55, 55));
      setIcon('folder');
    }
  }, [workspace, open]);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const h = Math.round((x / rect.width) * 360);
    setHue(h);
    setColor(hslToHex(h, 60, 55));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    updateFromClientX(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

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

  const sliderPct = (hue / 360) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card max-h-[90vh] overflow-y-auto">
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

          {/* Color Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Color</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{color.toUpperCase()}</span>
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
            <div
              ref={sliderRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative h-10 rounded-full cursor-pointer touch-none select-none"
              style={{
                background:
                  'linear-gradient(to right, hsl(0,60%,55%), hsl(30,60%,55%), hsl(60,60%,55%), hsl(90,60%,55%), hsl(120,60%,55%), hsl(150,60%,55%), hsl(180,60%,55%), hsl(210,60%,55%), hsl(240,60%,55%), hsl(270,60%,55%), hsl(300,60%,55%), hsl(330,60%,55%), hsl(360,60%,55%))',
              }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-elevated pointer-events-none"
                style={{
                  left: `${sliderPct}%`,
                  backgroundColor: color,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Drag the cursor and release to pick a color.</p>
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label className="text-foreground">Icon</Label>
            <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-1">
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
