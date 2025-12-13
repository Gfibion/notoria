import { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Tag,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Code,
  Save,
  X,
  Check,
  Undo,
  Pencil,
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

interface NoteEditorProps {
  note: Note | null;
  workspaces: Workspace[];
  onSave: (note: Partial<Note>) => void;
  onClose: () => void;
}

// Formatting button tooltips
const FORMAT_TOOLTIPS: Record<string, string> = {
  bold: 'Bold: Makes text thicker and more prominent',
  italic: 'Italic: Slants text for emphasis',
  h1: 'Heading 1: Largest heading for main titles',
  h2: 'Heading 2: Subheading for sections',
  ul: 'Bullet List: Unordered list with bullet points',
  ol: 'Numbered List: Ordered list with numbers',
  quote: 'Quote: Indented block for quotations',
  code: 'Code Block: Monospace text for code',
  undo: 'Undo: Reverse your last action',
};

export function NoteEditor({ note, workspaces, onSave, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [workspace, setWorkspace] = useState(note?.workspace || workspaces[0]?.id || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(!note); // New notes start in edit mode
  
  const contentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: note?.title || '', content: note?.content || '', tags: note?.tags || [] });
  const { toast } = useToast();

  // Initialize content once on mount
  useEffect(() => {
    if (contentRef.current && note?.content) {
      contentRef.current.innerHTML = note.content;
    }
  }, []);

  // Update when note changes (switching between notes)
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setWorkspace(note.workspace);
      setTags([...note.tags]);
      if (contentRef.current) {
        contentRef.current.innerHTML = note.content;
      }
      lastSavedRef.current = { title: note.title, content: note.content, tags: [...note.tags] };
      setHasChanges(false);
      setAutoSaveStatus('saved');
      setIsEditMode(false); // Existing notes open in reading mode
    } else {
      setIsEditMode(true); // New notes start in edit mode
    }
  }, [note?.id]);

  // Check for changes
  const checkChanges = useCallback(() => {
    const currentContent = contentRef.current?.innerHTML || '';
    const hasContentChanged = currentContent !== lastSavedRef.current.content;
    const hasTitleChanged = title !== lastSavedRef.current.title;
    const hasTagsChanged = JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);
    
    const changed = hasContentChanged || hasTitleChanged || hasTagsChanged;
    setHasChanges(changed);
    
    if (changed) {
      setAutoSaveStatus('unsaved');
    }
    
    return changed;
  }, [title, tags]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      if (checkChanges()) {
        performSave(true);
      }
    }, 2000);
  }, [checkChanges]);

  // Perform save
  const performSave = useCallback((isAutoSave = false) => {
    const content = contentRef.current?.innerHTML || '';
    
    setAutoSaveStatus('saving');
    
    onSave({ title, content, workspace, tags });
    
    lastSavedRef.current = { title, content, tags: [...tags] };
    setHasChanges(false);
    
    setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 500);
    
    if (!isAutoSave) {
      toast({ title: 'Note saved', description: 'Your changes have been saved.' });
    }
  }, [title, workspace, tags, onSave, toast]);

  // Handle manual save
  const handleSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    performSave(false);
  };

  // Handle undo
  const handleUndo = () => {
    document.execCommand('undo');
    checkChanges();
  };

  // Handle beforeunload for sudden closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        const content = contentRef.current?.innerHTML || '';
        onSave({ title, content, workspace, tags });
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, title, workspace, tags, onSave]);

  // Handle visibility change (for phone shutdown/app switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasChanges) {
        const content = contentRef.current?.innerHTML || '';
        onSave({ title, content, workspace, tags });
        lastSavedRef.current = { title, content, tags: [...tags] };
        setHasChanges(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasChanges, title, workspace, tags, onSave]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    triggerAutoSave();
  };

  // Show tooltip on long press
  const handleToolbarButtonLongPressStart = (tooltipKey: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveTooltip(tooltipKey);
      // Auto-hide after 3 seconds
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

    if (command === 'formatBlock') {
      const currentBlock = document.queryCommandValue('formatBlock');
      if (currentBlock.toLowerCase() === value?.toLowerCase()) {
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, value);
      }
    } else {
      document.execCommand(command, false, value);
    }

    contentRef.current.focus();
    
    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    checkChanges();
    triggerAutoSave();
  };

  // Handle content input without losing cursor position
  const handleContentInput = () => {
    checkChanges();
    triggerAutoSave();
    
    // Auto-scroll to cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorContainer = contentRef.current?.closest('.overflow-y-auto');
      
      if (editorContainer && rect) {
        const containerRect = editorContainer.getBoundingClientRect();
        const cursorBottom = rect.bottom;
        const containerBottom = containerRect.bottom - 100; // 100px buffer from bottom
        
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
    setWorkspace(value);
    triggerAutoSave();
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

  // Track format state for UI
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    h1: false,
    h2: false,
  });

  // Update format state on selection change
  useEffect(() => {
    const updateFormatState = () => {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
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

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Tooltip Display */}
      {activeTooltip && FORMAT_TOOLTIPS[activeTooltip] && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-4 py-2 shadow-elevated animate-fade-in">
          <p className="text-sm text-foreground">{FORMAT_TOOLTIPS[activeTooltip]}</p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Select value={workspace} onValueChange={handleWorkspaceChange}>
            <SelectTrigger className="w-[80px] h-8 text-xs">
              <SelectValue placeholder="Subs" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  <span style={{ color: ws.color }}>{ws.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {autoSaveStatus === 'saved' && (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="hidden sm:inline">Saved</span>
              </>
            )}
            {autoSaveStatus === 'saving' && (
              <span className="animate-pulse">Saving...</span>
            )}
            {autoSaveStatus === 'unsaved' && (
              <span className="text-gold">Unsaved</span>
            )}
          </div>
          <Button onClick={handleSave} disabled={!hasChanges} size="sm" className="gap-1 h-8 px-2">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Save</span>
          </Button>
          {/* Undo Button */}
          <ToolbarButton tooltipKey="undo" onClick={handleUndo} disabled={!isEditMode}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
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
          <ToolbarButton tooltipKey="quote" onClick={() => execCommand('formatBlock', 'blockquote')}>
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton tooltipKey="code" onClick={() => execCommand('formatBlock', 'pre')}>
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
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
                {isEditMode && <X className="w-3 h-3" />}
              </Badge>
            ))}
            {isEditMode && (
              <Input
                type="text"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-24 h-7 text-sm border-none shadow-none focus-visible:ring-0 px-2"
              />
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