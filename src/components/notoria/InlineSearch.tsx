import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Workspace } from '@/lib/db';
import { useNotes } from '@/hooks/useNotes';
import { Search, X, FileText, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface InlineSearchProps {
  isActive: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  onSelectNote: (note: Note, searchQuery: string) => void;
}

export function InlineSearch({
  isActive,
  onClose,
  workspaces,
  onSelectNote,
}: InlineSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { search } = useNotes();

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim()) {
        const found = await search(searchQuery);
        setResults(found);
        
        // Auto-open if only one result
        if (found.length === 1) {
          onSelectNote(found[0], searchQuery);
          onClose();
          setQuery('');
          setResults([]);
        }
      } else {
        setResults([]);
      }
    },
    [search, onSelectNote, onClose]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isActive) {
      setQuery('');
      setResults([]);
    }
  }, [isActive]);

  const getWorkspace = (id: string) => workspaces.find((ws) => ws.id === id);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 bg-background z-50 flex flex-col animate-fade-in">
      {/* Search Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0 text-lg px-0 flex-1"
          autoFocus
        />
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
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
        {results.length > 1 && results.map((note) => {
          const workspace = getWorkspace(note.workspace);
          return (
            <button
              key={note.id}
              onClick={() => {
                onSelectNote(note, query);
                onClose();
                setQuery('');
                setResults([]);
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
    </div>
  );
}
