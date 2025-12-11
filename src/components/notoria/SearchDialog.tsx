import { useState, useEffect, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { useNotes } from '@/hooks/useNotes';
import { Search, FileText, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
  onSelectNote: (note: Note) => void;
}

export function SearchDialog({
  open,
  onOpenChange,
  workspaces,
  onSelectNote,
}: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const { search } = useNotes();

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim()) {
        const found = await search(searchQuery);
        setResults(found);
      } else {
        setResults([]);
      }
    },
    [search]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query);
    }, 200);
    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const getWorkspace = (id: string) => workspaces.find((ws) => ws.id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Notes</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-lg px-0"
            autoFocus
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
          {results.length === 0 && query && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notes found for "{query}"</p>
            </div>
          )}
          {results.length === 0 && !query && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Type to search your notes</p>
            </div>
          )}
          {results.map((note) => {
            const workspace = getWorkspace(note.workspace);
            return (
              <button
                key={note.id}
                onClick={() => {
                  onSelectNote(note);
                  onOpenChange(false);
                }}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {note.title || 'Untitled'}
                    </h4>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {note.content.replace(/<[^>]*>/g, '').slice(0, 100)}
                    </p>
                  </div>
                  {workspace && (
                    <span
                      className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `${workspace.color}20`,
                        color: workspace.color,
                      }}
                    >
                      {workspace.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
