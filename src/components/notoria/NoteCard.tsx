import { useState, useRef, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Pin, Trash2, Star, Info, X, Calendar, Clock, FileText, Tag as TagIcon, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface NoteCardProps {
  note: Note;
  workspace?: Workspace;
  onClick: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
}

// Calculate approximate storage size of a note
function calculateNoteSize(note: Note): string {
  const json = JSON.stringify(note);
  const bytes = new Blob([json]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Count words in HTML content
function countWords(content: string): number {
  const text = content.replace(/<[^>]*>/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

export function NoteCard({ note, workspace, onClick, onPin, onStar, onDelete }: NoteCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  // Get first words if no title
  const getPreviewText = () => {
    const text = note.content.replace(/<[^>]*>/g, '').trim();
    if (!note.title && text) {
      return text.slice(0, 40) + (text.length > 40 ? '...' : '');
    }
    return text.slice(0, 60) + (text.length > 60 ? '...' : '');
  };

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

  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfoPopup(true);
  }, []);

  const wordCount = countWords(note.content);
  const noteSize = calculateNoteSize(note);

  return (
    <>
      <article
        ref={cardRef}
        className={cn(
          'note-card group cursor-pointer relative animate-fade-in p-3',
          note.isPinned && 'ring-1 ring-gold/30'
        )}
        onClick={() => !showContextMenu && !showInfoPopup && onClick()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Status indicators and Info button */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={handleInfoClick}
            className="h-5 w-5 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-3 h-3" />
          </button>
          {note.isStarred && (
            <Star className="w-3.5 h-3.5 text-gold fill-gold" />
          )}
          {note.isPinned && (
            <Pin className="w-3.5 h-3.5 text-gold fill-gold" />
          )}
        </div>

        {/* Title or Preview */}
        <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1 pr-16 mb-1">
          {note.title || getPreviewText() || 'Untitled'}
        </h3>

        {/* Short preview - only if title exists */}
        {note.title && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {getPreviewText() || 'No content yet...'}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <div className="flex items-center gap-2">
            {/* Tags preview */}
            {note.tags.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                #{note.tags[0]}
              </span>
            )}
            {note.tags.length > 1 && (
              <span className="text-xs text-muted-foreground">+{note.tags.length - 1}</span>
            )}
          </div>
          <span className="text-xs">
            {format(new Date(note.updatedAt), 'MMM d')}
          </span>
        </div>
      </article>

      {/* Info Popup */}
      {showInfoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowInfoPopup(false)}
        >
          <div
            className="bg-popover border border-border rounded-lg shadow-elevated p-4 w-full max-w-sm animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-semibold text-foreground">Note Info</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowInfoPopup(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Info Content */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="text-foreground">{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Last Modified</p>
                  <p className="text-foreground">{format(new Date(note.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Word Count</p>
                  <p className="text-foreground">{wordCount} words</p>
                </div>
              </div>

              {workspace && (
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded shrink-0" 
                    style={{ backgroundColor: workspace.color }}
                  />
                  <div>
                    <p className="text-muted-foreground text-xs">Category</p>
                    <p className="text-foreground">{workspace.name}</p>
                  </div>
                </div>
              )}

              {note.tags.length > 0 && (
                <div className="flex items-start gap-3">
                  <TagIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Storage Size</p>
                  <p className="text-foreground">{noteSize}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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