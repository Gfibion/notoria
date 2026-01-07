import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Plus,
  FileText,
  Check,
} from 'lucide-react';
import { Note } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File | string;
  fileName: string;
  notes: Note[];
  onClose: () => void;
  onAddToNote: (noteId: string, text: string, metadata: ExtractedTextMetadata) => void;
}

export interface ExtractedTextMetadata {
  pdfTitle: string;
  pageNumber: number;
  timestamp: Date;
}

export function PDFViewer({ file, fileName, notes, onClose, onAddToNote }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedText, setSelectedText] = useState('');
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfTitle, setPdfTitle] = useState(fileName);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle document load
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      setSelectedText(text);
    }
  }, []);

  // Listen for text selection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleTextSelection);
    container.addEventListener('touchend', handleTextSelection);

    return () => {
      container.removeEventListener('mouseup', handleTextSelection);
      container.removeEventListener('touchend', handleTextSelection);
    };
  }, [handleTextSelection]);

  // Navigation
  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(numPages, p + 1));

  // Zoom
  const zoomIn = () => setScale((s) => Math.min(2.5, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  // Add selected text to note
  const handleAddToNote = (noteId: string) => {
    if (!selectedText) return;

    const metadata: ExtractedTextMetadata = {
      pdfTitle,
      pageNumber: currentPage,
      timestamp: new Date(),
    };

    onAddToNote(noteId, selectedText, metadata);
    setSelectedText('');
    setShowNoteSelector(false);
    toast({ title: 'Text added to note' });
  };

  // Filter notes for search
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-sm truncate max-w-[200px] md:max-w-[400px]">
              {pdfTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 2.5}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          {/* Page navigation */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {currentPage} / {numPages}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={currentPage >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* PDF Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30"
      >
        <div className="flex justify-center p-4 min-h-full">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4" />
                <p>Failed to load PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>

      {/* Mobile Page Navigation */}
      <div className="md:hidden flex items-center justify-center gap-4 py-2 border-t border-border bg-card">
        <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentPage} / {numPages}
        </span>
        <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={currentPage >= numPages}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Selected Text Action Bar */}
      {selectedText && (
        <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg shadow-elevated p-3 max-w-sm md:max-w-lg animate-fade-in z-50">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm line-clamp-3">{selectedText}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNoteSelector(true)}
              className="shrink-0 gap-1"
            >
              <Plus className="w-4 h-4" />
              Add to Note
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => setSelectedText('')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Note Selector Dialog */}
      {showNoteSelector && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowNoteSelector(false)}
        >
          <div 
            className="bg-popover border border-border rounded-lg shadow-elevated w-full max-w-md max-h-[70vh] flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-semibold text-lg mb-3">Add to Note</h3>
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <ScrollArea className="flex-1 p-2">
              {filteredNotes.length > 0 ? (
                <div className="space-y-1">
                  {filteredNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleAddToNote(note.id)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{note.title || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No notes found</p>
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <Button variant="ghost" className="w-full" onClick={() => setShowNoteSelector(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
