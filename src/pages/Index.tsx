import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Workspace, getSettings, cleanupOldDeletedNotes } from '@/lib/db';
import { useNotes } from '@/hooks/useNotes';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Sidebar } from '@/components/notoria/Sidebar';
import { MobileHeader } from '@/components/notoria/MobileHeader';
import { NoteEditor } from '@/components/notoria/NoteEditor';
import { InlineSearch } from '@/components/notoria/InlineSearch';
import { EmptyState } from '@/components/notoria/EmptyState';
import { NotesGrid } from '@/components/notoria/NotesGrid';
import { InstallBanner } from '@/components/notoria/InstallBanner';
import { TrashView } from '@/components/notoria/TrashView';
import { SettingsDialog } from '@/components/notoria/SettingsDialog';
import { PDFViewer, ExtractedTextMetadata } from '@/components/notoria/PDFViewer';
import { generateExtractedTextHtml } from '@/components/notoria/ExtractedTextDisplay';
import { Plus, BookOpen, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { workspaces, loading: workspacesLoading, createWorkspace, updateWorkspace, removeWorkspace, reorder } = useWorkspaces();
  const {
    notes: allNotes,
    loading: notesLoading,
    createNote,
    updateNote,
    removeNote,
    togglePin,
    toggleStar,
    updateNoteColor,
    refresh,
  } = useNotes(showStarred ? undefined : (selectedWorkspace || undefined), showStarred);

  // Filter notes by subcategory if selected
  const notes = selectedSubcategory
    ? allNotes.filter(note => note.subcategory === selectedSubcategory)
    : allNotes;

  // Initialize settings and cleanup on load
  useEffect(() => {
    const initApp = async () => {
      await cleanupOldDeletedNotes();
      const settings = await getSettings();
      
      // Apply font
      const fonts: Record<string, string> = {
        inter: 'Inter, system-ui, sans-serif',
        times: '"Times New Roman", Times, serif',
        calibri: 'Calibri, "Gill Sans", sans-serif',
        georgia: 'Georgia, "Times New Roman", serif',
      };
      document.documentElement.style.setProperty('--app-font-family', fonts[settings.fontFamily] || fonts.inter);
      
      // Apply font size
      const fontSizes: Record<string, string> = {
        small: '14px',
        medium: '16px',
        large: '18px',
        xlarge: '20px',
      };
      document.documentElement.style.setProperty('--app-font-size', fontSizes[settings.fontSize || 'medium'] || fontSizes.medium);
      
      // Apply theme
      if (settings.theme === 'purple-gradient') {
        document.documentElement.setAttribute('data-theme', 'purple-gradient');
      }
    };
    initApp();
  }, []);

  // Back button navigation
  useEffect(() => {
    const handlePopState = () => {
      if (isEditorOpen) {
        setIsEditorOpen(false);
        setSelectedNote(null);
      } else if (isSearchActive) {
        setIsSearchActive(false);
      } else if (showTrash) {
        setShowTrash(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isEditorOpen, isSearchActive, showTrash]);

  // Push state when opening views
  useEffect(() => {
    if (isEditorOpen || isSearchActive || showTrash) {
      window.history.pushState({ view: 'sub' }, '');
    }
  }, [isEditorOpen, isSearchActive, showTrash]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchActive(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      if (e.key === 'Escape') {
        if (isSearchActive) setIsSearchActive(false);
        else if (isEditorOpen) {
          setIsEditorOpen(false);
          setSelectedNote(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, isSearchActive]);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setIsEditorOpen(true);
    setSidebarCollapsed(true);
  }, []);

  const handleNewNoteFromSidebar = useCallback((presetWorkspace?: string, presetSubcategory?: string) => {
    if (presetWorkspace !== undefined) {
      setSelectedWorkspace(presetWorkspace);
    }
    if (presetSubcategory !== undefined) {
      setSelectedSubcategory(presetSubcategory);
    }
    setSelectedNote(null);
    setIsEditorOpen(true);
    setSidebarCollapsed(true);
  }, []);

  const handleNoteClick = useCallback((note: Note, query?: string) => {
    setSelectedNote(note);
    setSearchQuery(query || '');
    setIsEditorOpen(true);
    setSidebarCollapsed(true); // Auto-collapse sidebar when opening a note
  }, []);

  const handleSaveNote = useCallback(
    async (noteData: Partial<Note>) => {
      try {
        if (selectedNote) {
          await updateNote(selectedNote.id, noteData);
        } else {
          // For new notes, use passed workspace or fall back to selected workspace
          const workspaceToUse = noteData.workspace || selectedWorkspace || '';
          const subcategoryToUse = noteData.subcategory || selectedSubcategory || '';
          const newNote = await createNote(
            noteData.title || '',
            noteData.content || '',
            workspaceToUse,
            noteData.tags || []
          );
          // Update with subcategory and color
          if (subcategoryToUse || noteData.color) {
            await updateNote(newNote.id, { subcategory: subcategoryToUse, color: noteData.color });
          }
          setSelectedNote(newNote);
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to save note.',
          variant: 'destructive',
        });
      }
    },
    [selectedNote, selectedWorkspace, selectedSubcategory, updateNote, createNote, toast]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      try {
        await removeNote(id);
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setIsEditorOpen(false);
        }
        toast({ title: 'Note moved to trash' });
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
      }
    },
    [selectedNote, removeNote, toast]
  );

  // Handle PDF file selection
  const handlePdfSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setIsPdfViewerOpen(true);
    } else if (file) {
      toast({ title: 'Please select a PDF file', variant: 'destructive' });
    }
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  }, [toast]);

  // Handle adding extracted text to note
  const handleAddExtractedTextToNote = useCallback(async (noteId: string, text: string, metadata: ExtractedTextMetadata) => {
    try {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;

      const extractedHtml = generateExtractedTextHtml(text, metadata);
      const newContent = note.content + `<p>${extractedHtml}</p>`;
      
      await updateNote(noteId, { content: newContent });
      refresh();
    } catch (err) {
      toast({ title: 'Failed to add text to note', variant: 'destructive' });
    }
  }, [allNotes, updateNote, refresh, toast]);

  const currentWorkspace = workspaces.find((ws) => ws.id === selectedWorkspace);
  const loading = workspacesLoading || notesLoading;

  // PDF Viewer
  if (isPdfViewerOpen && pdfFile) {
    return (
      <PDFViewer
        file={pdfFile}
        fileName={pdfFile.name}
        notes={allNotes.filter(n => !n.isDeleted)}
        onClose={() => {
          setIsPdfViewerOpen(false);
          setPdfFile(null);
        }}
        onAddToNote={handleAddExtractedTextToNote}
      />
    );
  }

  if (showTrash) {
    return (
      <TrashView
        workspaces={workspaces}
        onClose={() => setShowTrash(false)}
        onRestore={refresh}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Hidden PDF input */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfSelect}
        className="hidden"
      />
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          workspaces={workspaces}
          selectedWorkspace={selectedWorkspace}
          selectedSubcategory={selectedSubcategory}
          onSelectWorkspace={(id) => {
            setSelectedWorkspace(id);
            setShowStarred(false);
          }}
          onSelectSubcategory={(subcat) => {
            setSelectedSubcategory(subcat);
            setShowStarred(false);
          }}
          onNewNote={handleNewNote}
          onNewNoteInWorkspace={handleNewNoteFromSidebar}
          onOpenSearch={() => setIsSearchActive(true)}
          onOpenTrash={() => setShowTrash(true)}
          onOpenSettings={() => setShowSettings(true)}
          onShowStarred={() => {
            setShowStarred(true);
            setSelectedWorkspace(null);
            setSelectedSubcategory(null);
          }}
          showStarred={showStarred}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCreateWorkspace={async (name, color, icon) => { await createWorkspace(name, color, icon); }}
          onUpdateWorkspace={async (id, name, color, icon) => {
            await updateWorkspace(id, { name, color, icon });
          }}
          onDeleteWorkspace={removeWorkspace}
          onReorderWorkspaces={reorder}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        {!isEditorOpen && !isSearchActive && (
          <MobileHeader
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            selectedSubcategory={selectedSubcategory}
            onSelectWorkspace={(id) => {
              setSelectedWorkspace(id);
              setShowStarred(false);
            }}
            onSelectSubcategory={(subcat) => {
              setSelectedSubcategory(subcat);
              setShowStarred(false);
            }}
            onNewNote={handleNewNote}
            onNewNoteInWorkspace={handleNewNoteFromSidebar}
            onOpenSearch={() => setIsSearchActive(true)}
            onOpenTrash={() => setShowTrash(true)}
            onOpenSettings={() => setShowSettings(true)}
            onShowStarred={() => {
              setShowStarred(true);
              setSelectedWorkspace(null);
              setSelectedSubcategory(null);
            }}
            showStarred={showStarred}
            onCreateWorkspace={async (name, color, icon) => { await createWorkspace(name, color, icon); }}
            onUpdateWorkspace={async (id, name, color, icon) => {
              await updateWorkspace(id, { name, color, icon });
            }}
            onDeleteWorkspace={removeWorkspace}
            onOpenPdf={() => pdfInputRef.current?.click()}
          />
        )}

        {/* Inline Search */}
        {isSearchActive && (
          <InlineSearch
            isActive={isSearchActive}
            onClose={() => setIsSearchActive(false)}
            workspaces={workspaces}
            onSelectNote={handleNoteClick}
          />
        )}

        {isEditorOpen && !isSearchActive ? (
          <NoteEditor
            note={selectedNote}
            workspaces={workspaces}
            onSave={handleSaveNote}
            onClose={() => {
              setIsEditorOpen(false);
              setSelectedNote(null);
              setSearchQuery('');
              refresh();
            }}
            searchQuery={searchQuery}
            defaultWorkspace={selectedWorkspace || undefined}
            defaultSubcategory={selectedSubcategory || undefined}
          />
        ) : !isSearchActive && (
          <>
            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border">
              <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                  {showStarred 
                    ? 'Starred Notes' 
                    : selectedSubcategory 
                      ? `${currentWorkspace?.name || ''} / ${selectedSubcategory}`
                      : (currentWorkspace ? currentWorkspace.name : 'All Notes')
                  }
                </h1>
                <p className="text-muted-foreground mt-1">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => pdfInputRef.current?.click()} className="gap-2">
                  <FileText className="w-4 h-4" />
                  Open PDF
                </Button>
                <Button variant="outline" onClick={() => setIsSearchActive(true)} className="gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
                <Button onClick={handleNewNote} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Note
                </Button>
              </div>
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
                  onColorChange={updateNoteColor}
                />
              )}
            </div>

            {/* Floating Action Button */}
            <Button
              onClick={handleNewNote}
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated bg-gold/80 hover:bg-gold text-background z-40 backdrop-blur-sm"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </>
        )}
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />

      {/* Install Banner */}
      <InstallBanner />
    </div>
  );
};

export default Index;