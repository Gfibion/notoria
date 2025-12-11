import { Note, Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Pin, MoreVertical, Trash2, Copy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
  workspace?: Workspace;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, workspace, onClick, onPin, onDelete }: NoteCardProps) {
  const previewContent = note.content
    .replace(/<[^>]*>/g, '')
    .slice(0, 150)
    .trim();

  return (
    <article
      className={cn(
        'note-card group cursor-pointer relative animate-fade-in',
        note.isPinned && 'ring-1 ring-gold/30'
      )}
      onClick={onClick}
    >
      {/* Pinned indicator */}
      {note.isPinned && (
        <div className="absolute top-3 right-3 pinned-indicator">
          <Pin className="w-4 h-4 fill-current" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1 pr-8">
          {note.title || 'Untitled'}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 absolute top-3 right-3"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onPin}>
              <Pin className="w-4 h-4 mr-2" />
              {note.isPinned ? 'Unpin' : 'Pin to top'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  );
}
