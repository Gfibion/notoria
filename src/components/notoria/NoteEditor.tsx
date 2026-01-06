import { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Workspace, saveSubcategory, generateId, exportNoteAsTxt } from '@/lib/db';
import { useSubcategories } from '@/hooks/useSubcategories';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Tag,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Code,
  Save,
  Undo,
  Pencil,
  Palette,
  Plus,
  ChevronRight,
  Type,
  Highlighter,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Image,
  Link,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RainbowColorPicker } from './RainbowColorPicker';
import jsPDF from 'jspdf';

interface NoteEditorProps {
  note: Note | null;
  workspaces: Workspace[];
  onSave: (note: Partial<Note>) => void;
  onClose: () => void;
  searchQuery?: string;
  defaultWorkspace?: string;
  defaultSubcategory?: string;
}

// Formatting button tooltips
const FORMAT_TOOLTIPS: Record<string, string> = {
  bold: 'Bold: Makes text thicker and more prominent',
  italic: 'Italic: Slants text for emphasis',
  underline: 'Underline: Draws a line under text',
  h1: 'Heading 1: Largest heading for main titles',
  h2: 'Heading 2: Subheading for sections',
  ul: 'Bullet List: Unordered list with bullet points',
  ol: 'Numbered List: Ordered list with numbers',
  quote: 'Quote: Indented block for quotations',
  code: 'Code Block: Monospace text for code',
  undo: 'Undo: Reverse your last action',
  color: 'Color: Change note background color',
  fontColor: 'Font Color: Change text color',
  highlight: 'Highlight: Highlight text with color',
  export: 'Export TXT: Download note as text file',
  exportPdf: 'Export PDF: Download note as PDF document',
  import: 'Import: Upload a text file',
  image: 'Image: Insert an image into the note',
  link: 'Link: Insert a clickable link',
};

// Image alignment options
const IMAGE_ALIGNMENTS = [
  { value: 'inline', label: 'Inline' },
  { value: 'left', label: 'Float Left' },
  { value: 'right', label: 'Float Right' },
  { value: 'center', label: 'Center' },
];

// Image Insert Dialog Component
function ImageInsertDialog({ 
  onInsert, 
  onClose 
}: { 
  onInsert: (alignment: string, width: number, caption: string) => void;
  onClose: () => void;
}) {
  const [alignment, setAlignment] = useState('inline');
  const [width, setWidth] = useState(50);
  const [caption, setCaption] = useState('');
  const imageUrl = (window as any).__pendingImage;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-popover border border-border rounded-lg shadow-elevated p-4 w-full max-w-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-display font-semibold text-foreground mb-4">Insert Image</h4>
        
        {/* Preview */}
        {imageUrl && (
          <div className="mb-4 p-2 bg-muted rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Preview" 
              className="max-h-32 mx-auto object-contain"
              style={{ maxWidth: `${width}%` }}
            />
          </div>
        )}
        
        <div className="space-y-4">
          {/* Alignment */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Alignment</label>
            <div className="flex gap-2 flex-wrap">
              {IMAGE_ALIGNMENTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAlignment(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    alignment === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:bg-accent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Size: {width}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Caption (optional)</label>
            <Input
              placeholder="Image description..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onInsert(alignment, width, caption)}>
              Insert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const FONT_COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe',
  '#fbcfe8', '#fed7aa', '#ccfbf1', '#fecaca',
];

export function NoteEditor({ note, workspaces, onSave, onClose, searchQuery, defaultWorkspace, defaultSubcategory }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [workspace, setWorkspace] = useState(note?.workspace || defaultWorkspace || '');
  const [subcategory, setSubcategory] = useState(note?.subcategory || defaultSubcategory || '');
  const [noteColor, setNoteColor] = useState(note?.color || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(!note);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  
  const { subcategories, createSubcategory, refresh: refreshSubcategories } = useSubcategories(workspace || undefined);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ 
    title: note?.title || '', 
    content: note?.content || '', 
    tags: note?.tags || [],
    subcategory: note?.subcategory || '',
    color: note?.color || '',
    workspace: note?.workspace || '',
  });
  const { toast } = useToast();

  // Initialize content once on mount
  useEffect(() => {
    if (contentRef.current && note?.content) {
      contentRef.current.innerHTML = note.content;
    }
  }, []);

  // Highlight search query when opening a note from search
  useEffect(() => {
    if (searchQuery && contentRef.current) {
      const content = contentRef.current;
      const text = content.innerHTML;
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      
      // First, remove any existing highlights
      const cleanHtml = text.replace(/<mark class="search-highlight"[^>]*>([^<]+)<\/mark>/gi, '$1');
      
      // Then add new highlights
      const highlightedHtml = cleanHtml.replace(regex, '<mark class="search-highlight" style="background-color: #86efac; padding: 0 2px; border-radius: 2px;">$1</mark>');
      content.innerHTML = highlightedHtml;
      
      // Scroll to the first match
      setTimeout(() => {
        const firstMatch = content.querySelector('.search-highlight');
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [searchQuery]);

  // Update when note changes (switching between notes)
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setWorkspace(note.workspace || '');
      setSubcategory(note.subcategory || '');
      setNoteColor(note.color || '');
      setTags([...note.tags]);
      if (contentRef.current) {
        contentRef.current.innerHTML = note.content;
      }
      lastSavedRef.current = { 
        title: note.title, 
        content: note.content, 
        tags: [...note.tags],
        subcategory: note.subcategory || '',
        color: note.color || '',
        workspace: note.workspace || '',
      };
      setHasChanges(false);
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  }, [note?.id]);

  // Refresh subcategories when workspace changes
  useEffect(() => {
    if (workspace) {
      refreshSubcategories();
    }
  }, [workspace, refreshSubcategories]);

  // Check for changes
  const checkChanges = useCallback(() => {
    const currentContent = contentRef.current?.innerHTML || '';
    const hasContentChanged = currentContent !== lastSavedRef.current.content;
    const hasTitleChanged = title !== lastSavedRef.current.title;
    const hasTagsChanged = JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);
    const hasSubcategoryChanged = subcategory !== lastSavedRef.current.subcategory;
    const hasColorChanged = noteColor !== lastSavedRef.current.color;
    const hasWorkspaceChanged = workspace !== lastSavedRef.current.workspace;
    
    const changed = hasContentChanged || hasTitleChanged || hasTagsChanged || hasSubcategoryChanged || hasColorChanged || hasWorkspaceChanged;
    setHasChanges(changed);
    
    return changed;
  }, [title, tags, subcategory, noteColor, workspace]);

  // Perform save (silent autosave)
  const performSave = useCallback((showToast = false) => {
    const content = contentRef.current?.innerHTML || '';
    
    setIsSaving(true);
    onSave({ title, content, workspace, subcategory, color: noteColor, tags });
    
    lastSavedRef.current = { title, content, tags: [...tags], subcategory, color: noteColor, workspace };
    setHasChanges(false);
    setIsSaving(false);
    setJustSaved(true);
    
    // Clear saved indicator after 2 seconds
    if (savedIndicatorTimerRef.current) {
      clearTimeout(savedIndicatorTimerRef.current);
    }
    savedIndicatorTimerRef.current = setTimeout(() => {
      setJustSaved(false);
    }, 2000);
    
    if (showToast) {
      toast({ title: 'Note saved' });
    }
  }, [title, workspace, subcategory, noteColor, tags, onSave, toast]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      if (checkChanges()) {
        performSave(false); // Silent autosave
      }
    }, 2000);
  }, [checkChanges, performSave]);

  // Handle manual save
  const handleSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    performSave(true); // Show toast for manual save
  };

  // Handle undo
  const handleUndo = () => {
    document.execCommand('undo');
    checkChanges();
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    setNoteColor(color);
    setShowColorPicker(false);
    triggerAutoSave();
  };

  // Handle adding new subcategory
  const handleAddSubcategory = async () => {
    if (newSubcategoryName.trim() && workspace) {
      await createSubcategory(newSubcategoryName.trim(), workspace);
      setSubcategory(newSubcategoryName.trim());
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
      triggerAutoSave();
    }
  };

  // Save on close (autosave when closing)
  const handleClose = () => {
    if (hasChanges || checkChanges()) {
      performSave(false);
    }
    onClose();
  };

  // Handle beforeunload for sudden closure
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasChanges) {
        const content = contentRef.current?.innerHTML || '';
        onSave({ title, content, workspace, subcategory, color: noteColor, tags });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, title, workspace, subcategory, noteColor, tags, onSave]);

  // Handle visibility change (for phone shutdown/app switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && (hasChanges || checkChanges())) {
        const content = contentRef.current?.innerHTML || '';
        onSave({ title, content, workspace, subcategory, color: noteColor, tags });
        lastSavedRef.current = { title, content, tags: [...tags], subcategory, color: noteColor, workspace };
        setHasChanges(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasChanges, title, workspace, subcategory, noteColor, tags, onSave, checkChanges]);

  // Cleanup timers on unmount and save
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    };
  }, []);

  // Tag handlers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        const newTags = [...tags, newTag.trim()];
        setTags(newTags);
        triggerAutoSave();
      }
      setNewTag('');
    }
  };

  const handleAddTagClick = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const newTags = [...tags, newTag.trim()];
      setTags(newTags);
      triggerAutoSave();
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    triggerAutoSave();
  };

  // Show tooltip on long press
  const handleToolbarButtonLongPressStart = (tooltipKey: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveTooltip(tooltipKey);
      tooltipTimerRef.current = setTimeout(() => {
        setActiveTooltip(null);
      }, 3000);
    }, 500);
  };

  const handleToolbarButtonLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Format commands with proper toggling
  const execCommand = (command: string, value?: string) => {
    if (!isEditMode) return;
    
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return;

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    // Focus the content area first
    contentRef.current.focus();

    if (command === 'formatBlock') {
      const currentBlock = document.queryCommandValue('formatBlock');
      if (currentBlock.toLowerCase() === value?.toLowerCase()) {
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, value);
      }
    } else if (command === 'foreColor' || command === 'hiliteColor') {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false, value);
    }

    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    checkChanges();
    triggerAutoSave();
  };

  // Auto-detect and convert links in content
  const convertLinksInContent = useCallback(() => {
    if (!contentRef.current) return;
    
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const nodesToReplace: { node: Text; matches: RegExpMatchArray[] }[] = [];
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      const matches = [...node.textContent!.matchAll(urlRegex)];
      if (matches.length > 0 && !node.parentElement?.closest('a')) {
        nodesToReplace.push({ node, matches });
      }
    }
    
    nodesToReplace.forEach(({ node, matches }) => {
      let html = node.textContent || '';
      matches.forEach((match) => {
        const url = match[0];
        html = html.replace(url, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${url}</a>`);
      });
      const span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode?.replaceChild(span, node);
    });
  }, []);

  // Handle content input
  const handleContentInput = () => {
    checkChanges();
    triggerAutoSave();
    
    // Auto-detect links after a short delay
    setTimeout(convertLinksInContent, 500);
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorContainer = contentRef.current?.closest('.overflow-y-auto');
      
      if (editorContainer && rect) {
        const containerRect = editorContainer.getBoundingClientRect();
        const cursorBottom = rect.bottom;
        const containerBottom = containerRect.bottom - 100;
        
        if (cursorBottom > containerBottom) {
          editorContainer.scrollTop += cursorBottom - containerBottom + 20;
        }
      }
    }
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    triggerAutoSave();
  };

  // Handle workspace change
  const handleWorkspaceChange = (value: string) => {
    setWorkspace(value === 'none' ? '' : value);
    setSubcategory(''); // Reset subcategory when workspace changes
    triggerAutoSave();
  };

  // Handle subcategory change
  const handleSubcategoryChange = (value: string) => {
    if (value === 'new') {
      setShowNewSubcategoryInput(true);
    } else {
      setSubcategory(value === 'none' ? '' : value);
      triggerAutoSave();
    }
  };

  // Handle double tap to enter edit mode
  const handleContentDoubleClick = () => {
    if (!isEditMode) {
      setIsEditMode(true);
      setTimeout(() => {
        contentRef.current?.focus();
      }, 0);
    }
  };

  // Export note
  const handleExport = (format: 'txt' | 'pdf') => {
    if (!note && !title) {
      toast({ title: 'Nothing to export', variant: 'destructive' });
      return;
    }
    
    const content = contentRef.current?.innerHTML || '';
    const noteToExport: Note = {
      id: note?.id || generateId(),
      title: title || 'Untitled',
      content,
      workspace,
      subcategory,
      color: noteColor,
      isPinned: note?.isPinned || false,
      isStarred: note?.isStarred || false,
      isDeleted: false,
      createdAt: note?.createdAt || new Date(),
      updatedAt: new Date(),
      tags,
    };
    
    if (format === 'txt') {
      exportNoteAsTxt(noteToExport);
      toast({ title: 'Exported as TXT' });
    } else {
      // Professional PDF export using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Header with date
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(dateStr, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 10;

      // Title
      doc.setFontSize(24);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(title || 'Untitled', contentWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 10 + 5;

      // Category and subcategory
      if (workspace || subcategory) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        const currentWs = workspaces.find(ws => ws.id === workspace);
        const categoryText = [currentWs?.name, subcategory].filter(Boolean).join(' / ');
        doc.text(categoryText, margin, yPosition);
        yPosition += 8;
      }

      // Tags
      if (tags.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Tags: ${tags.map(t => `#${t}`).join(', ')}`, margin, yPosition);
        yPosition += 8;
      }

      // Divider line
      yPosition += 5;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Content - strip HTML and format
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Process content with proper formatting
      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || '';
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          const childText = Array.from(node.childNodes).map(processNode).join('');
          
          switch (tagName) {
            case 'h1':
              return `\n\n## ${childText}\n`;
            case 'h2':
              return `\n\n### ${childText}\n`;
            case 'h3':
              return `\n\n#### ${childText}\n`;
            case 'p':
              return `\n${childText}\n`;
            case 'br':
              return '\n';
            case 'li':
              return `  • ${childText}\n`;
            case 'ul':
            case 'ol':
              return `\n${childText}`;
            case 'blockquote':
              return `\n"${childText}"\n`;
            case 'pre':
            case 'code':
              return `\n[Code: ${childText}]\n`;
            default:
              return childText;
          }
        }
        
        return '';
      };

      let plainText = processNode(tempDiv);
      plainText = plainText.replace(/\n{3,}/g, '\n\n').trim();

      // Split text into lines that fit the page width
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      
      const lines = plainText.split('\n');
      
      for (const line of lines) {
        // Check if we need a new page
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage();
          yPosition = margin;
        }

        // Handle headers
        if (line.startsWith('## ')) {
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          const headerText = line.replace('## ', '');
          const headerLines = doc.splitTextToSize(headerText, contentWidth);
          doc.text(headerLines, margin, yPosition);
          yPosition += headerLines.length * 7 + 3;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
        } else if (line.startsWith('### ')) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          const headerText = line.replace('### ', '');
          const headerLines = doc.splitTextToSize(headerText, contentWidth);
          doc.text(headerLines, margin, yPosition);
          yPosition += headerLines.length * 6 + 2;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
        } else if (line.startsWith('#### ')) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          const headerText = line.replace('#### ', '');
          const headerLines = doc.splitTextToSize(headerText, contentWidth);
          doc.text(headerLines, margin, yPosition);
          yPosition += headerLines.length * 5 + 2;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
        } else if (line.trim()) {
          const textLines = doc.splitTextToSize(line, contentWidth);
          doc.text(textLines, margin, yPosition);
          yPosition += textLines.length * 5;
        } else {
          yPosition += 3; // Empty line spacing
        }
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Notoria Notes', margin, pageHeight - 10);
      }

      // Save the PDF
      doc.save(`${title || 'note'}.pdf`);
      toast({ title: 'Exported as PDF' });
    }
  };

  // Import from TXT - retain formatting
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const importedTitle = lines[0]?.trim() || '';
      // Preserve paragraph structure and convert line breaks properly
      const importedContent = lines.slice(1)
        .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
        .join('');
      
      if (importedTitle) setTitle(importedTitle);
      if (contentRef.current && importedContent) {
        contentRef.current.innerHTML = importedContent;
      }
      triggerAutoSave();
      toast({ title: 'File imported' });
    } catch (err) {
      toast({ title: 'Import failed', variant: 'destructive' });
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle image insertion
  const handleImageInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setShowImageDialog(true);
        // Store temporarily for the dialog
        (window as any).__pendingImage = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: 'Failed to load image', variant: 'destructive' });
    }
    
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Insert image with settings
  const insertImage = (alignment: string, width: number, caption: string) => {
    const dataUrl = (window as any).__pendingImage;
    if (!dataUrl || !contentRef.current) return;
    
    let imgHtml = '';
    const imgStyle = `max-width: ${width}%; height: auto;`;
    
    switch (alignment) {
      case 'left':
        imgHtml = `<figure style="float: left; margin: 0 16px 16px 0; max-width: ${width}%;"><img src="${dataUrl}" style="${imgStyle}" />${caption ? `<figcaption style="font-size: 12px; color: #666; text-align: center; margin-top: 4px;">${caption}</figcaption>` : ''}</figure>`;
        break;
      case 'right':
        imgHtml = `<figure style="float: right; margin: 0 0 16px 16px; max-width: ${width}%;"><img src="${dataUrl}" style="${imgStyle}" />${caption ? `<figcaption style="font-size: 12px; color: #666; text-align: center; margin-top: 4px;">${caption}</figcaption>` : ''}</figure>`;
        break;
      case 'center':
        imgHtml = `<figure style="text-align: center; margin: 16px 0;"><img src="${dataUrl}" style="${imgStyle}; margin: 0 auto;" />${caption ? `<figcaption style="font-size: 12px; color: #666; margin-top: 4px;">${caption}</figcaption>` : ''}</figure>`;
        break;
      default:
        imgHtml = `<img src="${dataUrl}" style="${imgStyle}; display: inline-block; vertical-align: middle;" />${caption ? `<span style="font-size: 12px; color: #666; margin-left: 8px;">${caption}</span>` : ''}`;
    }
    
    // Insert at cursor or append
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const fragment = range.createContextualFragment(imgHtml);
      range.insertNode(fragment);
    } else {
      contentRef.current.innerHTML += imgHtml;
    }
    
    delete (window as any).__pendingImage;
    setShowImageDialog(false);
    checkChanges();
    triggerAutoSave();
    toast({ title: 'Image inserted' });
  };

  // Insert link
  const insertLink = () => {
    if (!linkUrl.trim() || !contentRef.current) return;
    
    const displayText = linkText.trim() || linkUrl;
    const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${displayText}</a>`;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const fragment = range.createContextualFragment(linkHtml);
      range.insertNode(fragment);
    } else {
      contentRef.current.innerHTML += linkHtml;
    }
    
    setLinkUrl('');
    setLinkText('');
    setShowLinkDialog(false);
    checkChanges();
    triggerAutoSave();
  };

  // Track format state for UI
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false,
  });

  // Update format state on selection change
  useEffect(() => {
    const updateFormatState = () => {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        h1: document.queryCommandValue('formatBlock').toLowerCase() === 'h1',
        h2: document.queryCommandValue('formatBlock').toLowerCase() === 'h2',
      });
    };

    document.addEventListener('selectionchange', updateFormatState);
    return () => document.removeEventListener('selectionchange', updateFormatState);
  }, []);

  // Toolbar button component with long-press tooltip
  const ToolbarButton = ({ 
    tooltipKey, 
    isActive, 
    onClick, 
    children,
    disabled,
  }: { 
    tooltipKey: string; 
    isActive?: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 shrink-0 relative', isActive && 'bg-accent text-accent-foreground')}
      onClick={onClick}
      disabled={disabled}
      onTouchStart={() => handleToolbarButtonLongPressStart(tooltipKey)}
      onTouchEnd={handleToolbarButtonLongPressEnd}
      onTouchCancel={handleToolbarButtonLongPressEnd}
      onMouseDown={() => handleToolbarButtonLongPressStart(tooltipKey)}
      onMouseUp={handleToolbarButtonLongPressEnd}
      onMouseLeave={handleToolbarButtonLongPressEnd}
    >
      {children}
    </Button>
  );

  const currentWorkspace = workspaces.find(ws => ws.id === workspace);

  return (
    <div 
      className="h-full flex flex-col bg-background animate-fade-in"
      style={noteColor ? { backgroundColor: noteColor } : undefined}
    >
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleImport}
        className="hidden"
      />
      
      {/* Hidden file input for image */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageInsert}
        className="hidden"
      />

      {/* Tooltip Display */}
      {activeTooltip && FORMAT_TOOLTIPS[activeTooltip] && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-4 py-2 shadow-elevated animate-fade-in">
          <p className="text-sm text-foreground">{FORMAT_TOOLTIPS[activeTooltip]}</p>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <ImageInsertDialog
          onInsert={insertImage}
          onClose={() => {
            setShowImageDialog(false);
            delete (window as any).__pendingImage;
          }}
        />
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowLinkDialog(false)}
        >
          <div 
            className="bg-popover border border-border rounded-lg shadow-elevated p-4 w-full max-w-sm animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display font-semibold text-foreground mb-4">Insert Link</h4>
            <div className="space-y-3">
              <Input
                placeholder="URL (https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Display text (optional)"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={insertLink} disabled={!linkUrl.trim()}>
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Popup */}
      {showColorPicker && (
        <div className="fixed top-20 right-4 z-50">
          <RainbowColorPicker
            selectedColor={noteColor}
            onSelectColor={handleColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}

      {/* Font Color Picker */}
      {showFontColorPicker && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setShowFontColorPicker(false)}
        >
          <div 
            className="absolute top-32 left-4 bg-popover border border-border rounded-lg p-3 shadow-elevated animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground mb-2">Font Color</p>
            <div className="grid grid-cols-4 gap-1">
              {FONT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    execCommand('foreColor', color);
                    setShowFontColorPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Highlight Color Picker */}
      {showHighlightPicker && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setShowHighlightPicker(false)}
        >
          <div 
            className="absolute top-32 left-20 bg-popover border border-border rounded-lg p-3 shadow-elevated animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground mb-2">Highlight</p>
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    execCommand('hiliteColor', color);
                    setShowHighlightPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Subcategory Input Popup */}
      {showNewSubcategoryInput && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowNewSubcategoryInput(false)}
        >
          <div 
            className="bg-popover border border-border rounded-lg shadow-elevated p-4 w-full max-w-sm animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display font-semibold text-foreground mb-4">New Subcategory</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Subcategory name..."
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubcategory()}
                autoFocus
              />
              <Button onClick={handleAddSubcategory} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {/* Workspace (Category) selector */}
          <Select value={workspace || 'none'} onValueChange={handleWorkspaceChange}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No category</span>
              </SelectItem>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: ws.color }}
                    />
                    {ws.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Subcategory selector (only if workspace is selected) */}
          {workspace && (
            <Select value={subcategory || 'none'} onValueChange={handleSubcategoryChange}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue placeholder="Sub" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No sub</span>
                </SelectItem>
                {subcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.name}>
                    {sub.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">
                  <span className="flex items-center gap-1 text-primary">
                    <Plus className="w-3 h-3" /> Add
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Undo Button */}
          <ToolbarButton tooltipKey="undo" onClick={handleUndo} disabled={!isEditMode}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges && !isSaving} 
            size="sm" 
            className={cn(
              "gap-1 h-8 px-2 transition-colors",
              hasChanges && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
              justSaved && !hasChanges && "bg-green-600 hover:bg-green-600/90 text-white",
              !hasChanges && !justSaved && "bg-muted text-muted-foreground"
            )}
          >
            {justSaved && !hasChanges ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-xs">{justSaved && !hasChanges ? 'Saved' : 'Save'}</span>
          </Button>
          {/* Color Picker Button */}
          <ToolbarButton tooltipKey="color" onClick={() => setShowColorPicker(!showColorPicker)}>
            <Palette className="w-4 h-4" style={noteColor ? { color: noteColor } : undefined} />
          </ToolbarButton>
        </div>
      </header>

      {/* Toolbar - only visible in edit mode */}
      {isEditMode && (
        <div className="flex items-center gap-1 px-4 md:px-6 py-2 border-b border-border bg-muted/30 overflow-x-auto">
          <ToolbarButton tooltipKey="bold" isActive={formatState.bold} onClick={() => execCommand('bold')}>
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton tooltipKey="italic" isActive={formatState.italic} onClick={() => execCommand('italic')}>
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton tooltipKey="underline" isActive={formatState.underline} onClick={() => execCommand('underline')}>
            <Underline className="w-4 h-4" />
          </ToolbarButton>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <ToolbarButton tooltipKey="h1" isActive={formatState.h1} onClick={() => execCommand('formatBlock', 'h1')}>
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton tooltipKey="h2" isActive={formatState.h2} onClick={() => execCommand('formatBlock', 'h2')}>
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <ToolbarButton tooltipKey="ul" onClick={() => execCommand('insertUnorderedList')}>
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton tooltipKey="ol" onClick={() => execCommand('insertOrderedList')}>
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          
          {/* Collapsible extra tools toggle */}
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 shrink-0 transition-transform', showExtraTools && 'rotate-90')}
            onClick={() => setShowExtraTools(!showExtraTools)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          {/* Extra tools (collapsible) */}
          {showExtraTools && (
            <>
              <ToolbarButton tooltipKey="fontColor" onClick={() => setShowFontColorPicker(true)}>
                <Type className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton tooltipKey="highlight" onClick={() => setShowHighlightPicker(true)}>
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton tooltipKey="quote" onClick={() => execCommand('formatBlock', 'blockquote')}>
                <Quote className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton tooltipKey="code" onClick={() => execCommand('formatBlock', 'pre')}>
                <Code className="w-4 h-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <ToolbarButton tooltipKey="export" onClick={() => handleExport('txt')}>
                <ArrowUpFromLine className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton tooltipKey="exportPdf" onClick={() => handleExport('pdf')}>
                <FileText className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton tooltipKey="import" onClick={() => fileInputRef.current?.click()}>
                <ArrowDownToLine className="w-4 h-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <ToolbarButton tooltipKey="image" onClick={() => imageInputRef.current?.click()}>
                <Image className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton tooltipKey="link" onClick={() => setShowLinkDialog(true)}>
                <Link className="w-4 h-4" />
              </ToolbarButton>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Category indicator */}
          {currentWorkspace && (
            <div className="flex items-center gap-2 mb-4">
              <span 
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: `${currentWorkspace.color}20`, color: currentWorkspace.color }}
              >
                {currentWorkspace.name}
              </span>
              {subcategory && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {subcategory}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            placeholder="Untitled"
            value={title}
            onChange={handleTitleChange}
            readOnly={!isEditMode}
            onClick={() => !isEditMode && setIsEditMode(true)}
            className={cn(
              "w-full text-2xl md:text-4xl font-display font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-4 md:mb-6",
              !isEditMode && "cursor-pointer"
            )}
          />

          {/* Tags - editable only in edit mode */}
          <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn("gap-1", isEditMode && "cursor-pointer hover:bg-destructive/20")}
                onClick={() => isEditMode && handleRemoveTag(tag)}
              >
                #{tag}
              </Badge>
            ))}
            {isEditMode && (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  enterKeyHint="done"
                  className="w-24 h-7 text-sm border-none shadow-none focus-visible:ring-0 px-2"
                />
                {newTag.trim() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleAddTagClick}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Editor */}
          <div
            ref={contentRef}
            contentEditable={isEditMode}
            onInput={handleContentInput}
            onDoubleClick={handleContentDoubleClick}
            className={cn(
              "editor-content min-h-[300px] md:min-h-[400px] outline-none focus:outline-none",
              !isEditMode && "cursor-pointer"
            )}
            data-placeholder="Start writing..."
            suppressContentEditableWarning
          />
        </div>

        {/* Floating Edit Button - only visible in reading mode */}
        {!isEditMode && (
          <Button
            onClick={() => {
              setIsEditMode(true);
              setTimeout(() => contentRef.current?.focus(), 0);
            }}
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated bg-gold hover:bg-gold/90 text-background z-40"
          >
            <Pencil className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
