import { useState, useEffect, useCallback } from 'react';
import { Note, Workspace, getDeletedNotes, restoreNote, deleteNote, cleanupOldDeletedNotes } from '@/lib/db';
import { Trash2, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TrashViewProps {
  workspaces: Workspace[];
  onClose: () => void;
  onRestore: () => void;
}

export function TrashView({ workspaces, onClose, onRestore }: TrashViewProps) {
  const [deletedNotes, setDeletedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDeletedNotes = useCallback(async () => {
    setLoading(true);
    await cleanupOldDeletedNotes(); // Auto-cleanup on load
    const notes = await getDeletedNotes();
    setDeletedNotes(notes);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDeletedNotes();
  }, [loadDeletedNotes]);

  const handleRestore = async (id: string) => {
    await restoreNote(id);
    await loadDeletedNotes();
    onRestore();
    toast({ title: 'Note restored', description: 'The note has been restored to your notes.' });
  };

  const handlePermanentDelete = async (id: string) => {
    await deleteNote(id);
    await loadDeletedNotes();
    setConfirmDelete(null);
    toast({ title: 'Note permanently deleted', description: 'The note has been removed forever.' });
  };

  const getDaysRemaining = (deletedAt: Date) => {
    const daysElapsed = differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, 30 - daysElapsed);
  };

  const getWorkspace = (id: string) => workspaces.find((ws) => ws.id === id);

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Trash</h1>
            <p className="text-xs text-muted-foreground">Notes are permanently deleted after 30 days</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : deletedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Trash2 className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Trash is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Deleted notes will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deletedNotes.map((note) => {
              const workspace = getWorkspace(note.workspace);
              const daysRemaining = note.deletedAt ? getDaysRemaining(note.deletedAt) : 30;

              return (
                <div
                  key={note.id}
                  className={cn(
                    'p-4 rounded-lg border border-border bg-card',
                    note.color && 'border-0'
                  )}
                  style={note.color ? { backgroundColor: note.color } : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        'font-medium line-clamp-1',
                        note.color ? 'text-gray-800' : 'text-foreground'
                      )}>
                        {note.title || 'Untitled'}
                      </h3>
                      <p className={cn(
                        'text-sm line-clamp-2 mt-1',
                        note.color ? 'text-gray-600' : 'text-muted-foreground'
                      )}>
                        {note.content.replace(/<[^>]*>/g, '').slice(0, 100)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {workspace && (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${workspace.color}20`,
                              color: workspace.color,
                            }}
                          >
                            {workspace.name}
                          </span>
                        )}
                        <span className={cn(
                          'px-2 py-0.5 rounded-full',
                          daysRemaining <= 7 ? 'bg-destructive/20 text-destructive' : 'bg-muted'
                        )}>
                          {daysRemaining} days left
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestore(note.id)}
                        className="h-8 w-8"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(note.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Confirm Delete Dialog */}
                  {confirmDelete === note.id && (
                    <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive">Delete permanently?</p>
                          <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handlePermanentDelete(note.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
