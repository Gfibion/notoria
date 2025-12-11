import { useState, useEffect, useRef } from 'react';
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

interface NoteEditorProps {
  note: Note | null;
  workspaces: Workspace[];
  onSave: (note: Partial<Note>) => void;
  onClose: () => void;
  onTogglePin: () => void;
}

export function NoteEditor({ note, workspaces, onSave, onClose, onTogglePin }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [workspace, setWorkspace] = useState(note?.workspace || workspaces[0]?.id || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setWorkspace(note.workspace);
      setTags(note.tags);
    }
  }, [note]);

  useEffect(() => {
    const original = note
      ? { title: note.title, content: note.content, workspace: note.workspace, tags: note.tags }
      : { title: '', content: '', workspace: workspaces[0]?.id || '', tags: [] };
    const current = { title, content, workspace, tags };
    setHasChanges(JSON.stringify(original) !== JSON.stringify(current));
  }, [title, content, workspace, tags, note, workspaces]);

  const handleSave = () => {
    onSave({ title, content, workspace, tags });
    setHasChanges(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  const handleContentChange = () => {
    if (contentRef.current) {
      setContent(contentRef.current.innerHTML);
    }
  };

  const currentWorkspace = workspaces.find((ws) => ws.id === workspace);

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Select value={workspace} onValueChange={setWorkspace}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePin}
            className={cn(note?.isPinned && 'text-gold')}
          >
            <Pin className={cn('w-5 h-5', note?.isPinned && 'fill-current')} />
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-muted/30">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('bold')}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('italic')}>
          <Italic className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('formatBlock', 'h1')}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('formatBlock', 'h2')}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('insertUnorderedList')}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('insertOrderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('formatBlock', 'blockquote')}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('formatBlock', 'pre')}
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Title */}
          <input
            type="text"
            placeholder="Untitled"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-display font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-6"
          />

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Tag className="w-4 h-4 text-muted-foreground" />
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

          {/* Editor */}
          <div
            ref={contentRef}
            contentEditable
            onInput={handleContentChange}
            dangerouslySetInnerHTML={{ __html: content }}
            className="editor-content min-h-[400px] outline-none focus:outline-none empty:before:content-['Start_writing...'] empty:before:text-muted-foreground/50"
            suppressContentEditableWarning
          />
        </div>
      </div>
    </div>
  );
}
