import { useState, useEffect, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { useNotes } from '@/hooks/useNotes';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Sidebar } from '@/components/notoria/Sidebar';
import { MobileHeader } from '@/components/notoria/MobileHeader';
import { NoteEditor } from '@/components/notoria/NoteEditor';
import { SearchDialog } from '@/components/notoria/SearchDialog';
import { EmptyState } from '@/components/notoria/EmptyState';
import { NotesGrid } from '@/components/notoria/NotesGrid';
import { InstallBanner } from '@/components/notoria/InstallBanner';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  const {
    notes,
    loading: notesLoading,
    createNote,
    updateNote,
    removeNote,
    togglePin,
    toggleStar,
    refresh,
  } = useNotes(selectedWorkspace || undefined);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      if (e.key === 'Escape' && isEditorOpen) {
        setIsEditorOpen(false);
        setSelectedNote(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen]);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setIsEditorOpen(true);
  }, []);

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  }, []);

  const handleSaveNote = useCallback(
    async (noteData: Partial<Note>) => {
      try {
        if (selectedNote) {
          await updateNote(selectedNote.id, noteData);
          toast({ title: 'Note updated', description: 'Your changes have been saved.' });
        } else {
          const newNote = await createNote(
            noteData.title || 'Untitled',
            noteData.content || '',
            noteData.workspace || workspaces[0]?.id || 'personal',
            noteData.tags || []
          );
          setSelectedNote(newNote);
          toast({ title: 'Note created', description: 'Your new note is ready.' });
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to save note. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [selectedNote, updateNote, createNote, workspaces, toast]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      try {
        await removeNote(id);
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setIsEditorOpen(false);
        }
        toast({ title: 'Note deleted', description: 'The note has been removed.' });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to delete note.',
          variant: 'destructive',
        });
      }
    },
    [selectedNote, removeNote, toast]
  );

  const handleSearchSelect = useCallback((note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  }, []);

  const currentWorkspace = workspaces.find((ws) => ws.id === selectedWorkspace);
  const loading = workspacesLoading || notesLoading;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          workspaces={workspaces}
          selectedWorkspace={selectedWorkspace}
          onSelectWorkspace={setSelectedWorkspace}
          onNewNote={handleNewNote}
          onOpenSearch={() => setIsSearchOpen(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {!isEditorOpen && (
          <MobileHeader
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onSelectWorkspace={setSelectedWorkspace}
            onNewNote={handleNewNote}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {isEditorOpen ? (
          <NoteEditor
            note={selectedNote}
            workspaces={workspaces}
            onSave={handleSaveNote}
            onClose={() => {
              setIsEditorOpen(false);
              setSelectedNote(null);
              refresh();
            }}
          />
        ) : (
          <>
            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border">
              <div>
                <h1 className="font-display text-3xl font-semibold text-foreground">
                  {currentWorkspace ? currentWorkspace.name : 'All Notes'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </p>
              </div>
              <Button onClick={handleNewNote} className="gap-2">
                <Plus className="w-4 h-4" />
                New Note
              </Button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-8">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-4">
                    <BookOpen className="w-12 h-12 text-gold animate-pulse" />
                    <p className="text-muted-foreground">Loading your notes...</p>
                  </div>
                </div>
              ) : notes.length === 0 ? (
                <EmptyState onCreateNote={handleNewNote} />
              ) : (
                <NotesGrid
                  notes={notes}
                  workspaces={workspaces}
                  onNoteClick={handleNoteClick}
                  onPinNote={togglePin}
                  onStarNote={toggleStar}
                  onDeleteNote={handleDeleteNote}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Search Dialog */}
      <SearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        workspaces={workspaces}
        onSelectNote={handleSearchSelect}
      />

      {/* Install Banner */}
      <InstallBanner />
    </div>
  );
};

export default Index;
