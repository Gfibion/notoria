import { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Pin,
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
  onTogglePin: () => void;
}

export function NoteEditor({ note, workspaces, onSave, onClose, onTogglePin }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [workspace, setWorkspace] = useState(note?.workspace || workspaces[0]?.id || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  const contentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    }, 2000); // 2 second debounce
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

  // Handle beforeunload for sudden closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        // Save before unload
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

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
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

  // Format commands with proper toggling
  const execCommand = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return;

    // Save selection before executing command
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (command === 'formatBlock') {
      // For block-level formatting, check if already applied
      const currentBlock = document.queryCommandValue('formatBlock');
      if (currentBlock.toLowerCase() === value?.toLowerCase()) {
        // Remove formatting by setting to paragraph
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, value);
      }
    } else {
      // For inline formatting (bold, italic), execCommand handles toggle
      document.execCommand(command, false, value);
    }

    // Restore focus and trigger change detection
    contentRef.current.focus();
    
    // Restore selection if possible
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

  // Check active format states
  const isFormatActive = (command: string, value?: string): boolean => {
    if (command === 'formatBlock') {
      const currentBlock = document.queryCommandValue('formatBlock');
      return currentBlock.toLowerCase() === value?.toLowerCase();
    }
    return document.queryCommandState(command);
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

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Select value={workspace} onValueChange={handleWorkspaceChange}>
            <SelectTrigger className="w-[120px] md:w-[140px] h-8 text-sm">
              <SelectValue />
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
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePin}
            className={cn(note?.isPinned && 'text-gold')}
          >
            <Pin className={cn('w-5 h-5', note?.isPinned && 'fill-current')} />
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 md:px-6 py-2 border-b border-border bg-muted/30 overflow-x-auto">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', formatState.bold && 'bg-accent text-accent-foreground')}
          onClick={() => execCommand('bold')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', formatState.italic && 'bg-accent text-accent-foreground')}
          onClick={() => execCommand('italic')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', formatState.h1 && 'bg-accent text-accent-foreground')}
          onClick={() => execCommand('formatBlock', 'h1')}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', formatState.h2 && 'bg-accent text-accent-foreground')}
          onClick={() => execCommand('formatBlock', 'h2')}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => execCommand('insertUnorderedList')}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => execCommand('insertOrderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => execCommand('formatBlock', 'blockquote')}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => execCommand('formatBlock', 'pre')}
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Title */}
          <input
            type="text"
            placeholder="Untitled"
            value={title}
            onChange={handleTitleChange}
            className="w-full text-2xl md:text-4xl font-display font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-4 md:mb-6"
          />

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => handleRemoveTag(tag)}
              >
                #{tag}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            <Input
              type="text"
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-24 h-7 text-sm border-none shadow-none focus-visible:ring-0 px-2"
            />
          </div>

          {/* Editor - No dangerouslySetInnerHTML to prevent cursor jumping */}
          <div
            ref={contentRef}
            contentEditable
            onInput={handleContentInput}
            className="editor-content min-h-[300px] md:min-h-[400px] outline-none focus:outline-none"
            data-placeholder="Start writing..."
            suppressContentEditableWarning
          />
        </div>
      </div>
    </div>
  );
}
