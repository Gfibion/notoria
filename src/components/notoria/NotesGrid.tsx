import { Note, Workspace } from '@/lib/db';
import { NoteCard } from './NoteCard';

interface NotesGridProps {
  notes: Note[];
  workspaces: Workspace[];
  onNoteClick: (note: Note) => void;
  onPinNote: (id: string) => void;
  onStarNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onColorChange?: (id: string, color: string) => void;
}

export function NotesGrid({
  notes,
  workspaces,
  onNoteClick,
  onPinNote,
  onStarNote,
  onDeleteNote,
  onColorChange,
}: NotesGridProps) {
  const getWorkspace = (id: string) => workspaces.find((ws) => ws.id === id);
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-8">
      {pinnedNotes.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Pinned
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {pinnedNotes.map((note, index) => (
              <div
                key={note.id}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <NoteCard
                  note={note}
                  workspace={getWorkspace(note.workspace)}
                  onClick={() => onNoteClick(note)}
                  onPin={() => onPinNote(note.id)}
                  onStar={() => onStarNote(note.id)}
                  onDelete={() => onDeleteNote(note.id)}
                  onColorChange={onColorChange ? (color) => onColorChange(note.id, color) : undefined}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {unpinnedNotes.length > 0 && (
        <section>
          {pinnedNotes.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-stone" />
              Recent
            </h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unpinnedNotes.map((note, index) => (
              <div
                key={note.id}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${(pinnedNotes.length + index) * 50}ms` }}
              >
                <NoteCard
                  note={note}
                  workspace={getWorkspace(note.workspace)}
                  onClick={() => onNoteClick(note)}
                  onPin={() => onPinNote(note.id)}
                  onStar={() => onStarNote(note.id)}
                  onDelete={() => onDeleteNote(note.id)}
                  onColorChange={onColorChange ? (color) => onColorChange(note.id, color) : undefined}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}