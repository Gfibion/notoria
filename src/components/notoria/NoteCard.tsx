import { useState, useRef, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Pin, Trash2, Star, Info, X, Calendar, Clock, FileText, Tag as TagIcon, HardDrive, Palette, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ColorPicker } from './ColorPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NoteCardProps {
  note: Note;
  workspace?: Workspace;
  onClick: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
  onColorChange?: (color: string) => void;
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

export function NoteCard({ note, workspace, onClick, onPin, onStar, onDelete, onColorChange }: NoteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoPopupOpen, setInfoPopupOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
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

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setMenuOpen(true);
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
    setMenuOpen(true);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    action();
    setMenuOpen(false);
  }, []);

  const handleColorClick = useCallback(() => {
    setColorPickerOpen(true);
    setMenuOpen(false);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    if (onColorChange) {
      onColorChange(color);
    }
    setColorPickerOpen(false);
  }, [onColorChange]);

  const wordCount = countWords(note.content);
  const noteSize = calculateNoteSize(note);

  const isAnyPopupOpen = menuOpen || infoPopupOpen || colorPickerOpen;

  return (
    <article
      ref={cardRef}
      className={cn(
        'note-card group cursor-pointer relative animate-fade-in p-3',
        note.isPinned && 'ring-1 ring-gold/30'
      )}
      style={note.color ? { backgroundColor: note.color } : undefined}
      onClick={() => !isAnyPopupOpen && onClick()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Top right controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Info Popover */}
        <Popover open={infoPopupOpen} onOpenChange={setInfoPopupOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-72 p-4 bg-popover border border-border shadow-elevated z-[60]" 
            align="end"
            side="bottom"
            sideOffset={8}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-semibold text-foreground">Note Info</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setInfoPopupOpen(false)}
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

              {note.subcategory && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shrink-0 bg-secondary" />
                  <div>
                    <p className="text-muted-foreground text-xs">Subcategory</p>
                    <p className="text-foreground">{note.subcategory}</p>
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
          </PopoverContent>
        </Popover>

        {/* Actions Menu */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-44 bg-popover border border-border shadow-elevated z-[60]"
            align="end"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuItem 
              className="flex items-center gap-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onPin);
              }}
            >
              <Pin className={cn('w-4 h-4', note.isPinned && 'fill-gold text-gold')} />
              {note.isPinned ? 'Unpin' : 'Pin to top'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onStar);
              }}
            >
              <Star className={cn('w-4 h-4', note.isStarred && 'fill-gold text-gold')} />
              {note.isStarred ? 'Unstar' : 'Star'}
            </DropdownMenuItem>
            {onColorChange && (
              <DropdownMenuItem 
                className="flex items-center gap-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorClick();
                }}
              >
                <Palette className="w-4 h-4" style={note.color ? { color: note.color } : undefined} />
                Change color
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onDelete);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {note.isStarred && (
          <Star className="w-3.5 h-3.5 text-gold fill-gold" />
        )}
        {note.isPinned && (
          <Pin className="w-3.5 h-3.5 text-gold fill-gold" />
        )}
      </div>

      {/* Title or Preview */}
      <h3 className={cn(
        "font-display text-sm font-semibold line-clamp-1 pr-24 mb-1",
        note.color ? "text-gray-800" : "text-foreground"
      )}>
        {note.title || getPreviewText() || 'Untitled'}
      </h3>

      {/* Short preview - only if title exists */}
      {note.title && (
        <p className={cn(
          "text-xs line-clamp-1 mb-2",
          note.color ? "text-gray-600" : "text-muted-foreground"
        )}>
          {getPreviewText() || 'No content yet...'}
        </p>
      )}

      {/* Footer */}
      <div className={cn(
        "flex items-center justify-between text-xs mt-auto",
        note.color ? "text-gray-600" : "text-muted-foreground"
      )}>
        <div className="flex items-center gap-2">
          {/* Tags preview */}
          {note.tags.length > 0 && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              note.color ? "bg-white/50 text-gray-700" : "bg-secondary text-secondary-foreground"
            )}>
              #{note.tags[0]}
            </span>
          )}
          {note.tags.length > 1 && (
            <span className="text-xs">+{note.tags.length - 1}</span>
          )}
        </div>
        <span className="text-xs">
          {format(new Date(note.updatedAt), 'MMM d')}
        </span>
      </div>

      {/* Color Picker Dialog */}
      {colorPickerOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setColorPickerOpen(false);
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ColorPicker
              selectedColor={note.color || ''}
              onSelectColor={handleColorSelect}
              onClose={() => setColorPickerOpen(false)}
            />
          </div>
        </div>
      )}
    </article>
  );
}
