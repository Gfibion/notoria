import { useState, useRef, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Pin, Trash2, Star, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
  workspace?: Workspace;
  onClick: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, workspace, onClick, onPin, onStar, onDelete }: NoteCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  const previewContent = note.content
    .replace(/<[^>]*>/g, '')
    .slice(0, 150)
    .trim();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowContextMenu(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    action();
    setShowContextMenu(false);
  }, []);

  return (
    <>
      <article
        ref={cardRef}
        className={cn(
          'note-card group cursor-pointer relative animate-fade-in',
          note.isPinned && 'ring-1 ring-gold/30'
        )}
        onClick={() => !showContextMenu && onClick()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Status indicators */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {note.isStarred && (
            <Star className="w-4 h-4 text-gold fill-gold" />
          )}
          {note.isPinned && (
            <Pin className="w-4 h-4 text-gold fill-gold" />
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1 pr-12">
            {note.title || 'Untitled'}
          </h3>
        </div>

        {/* Preview content */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {previewContent || 'No content yet...'}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {workspace && (
            <span
              className="workspace-badge"
              style={{ backgroundColor: `${workspace.color}20`, color: workspace.color }}
            >
              {workspace.name}
            </span>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{note.tags.length - 3} more</span>
            )}
          </div>
        )}
      </article>

      {/* Context Menu Overlay */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowContextMenu(false)}
          onTouchStart={() => setShowContextMenu(false)}
        >
          <div
            className="absolute bg-popover border border-border rounded-lg shadow-elevated p-2 min-w-[160px] animate-fade-in"
            style={{
              left: Math.min(menuPosition.x, window.innerWidth - 180),
              top: Math.min(menuPosition.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => setShowContextMenu(false)}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="space-y-1 pt-4">
              <button
                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground transition-colors"
                onClick={() => handleAction(onPin)}
              >
                <Pin className={cn('w-4 h-4', note.isPinned && 'fill-gold text-gold')} />
                {note.isPinned ? 'Unpin' : 'Pin to top'}
              </button>
              <button
                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground transition-colors"
                onClick={() => handleAction(onStar)}
              >
                <Star className={cn('w-4 h-4', note.isStarred && 'fill-gold text-gold')} />
                {note.isStarred ? 'Unstar' : 'Star'}
              </button>
              <div className="h-px bg-border my-1" />
              <button
                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                onClick={() => handleAction(onDelete)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
