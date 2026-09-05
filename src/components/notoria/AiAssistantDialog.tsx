import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Sparkles, Plus, Trash2, Send, Loader2, History, Check, Wand2, FileText, Tags, X, Paperclip,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Note, Workspace, getAllNotes, getAllWorkspaces, saveNote, saveWorkspace, generateId,
} from '@/lib/db';
import {
  aiApi, noteEnvelope, fileToAttachment, MAX_ATTACHMENTS,
  type AiAttachment, type AiMessage, type AiResult, type AiSession, type AiTask, type AiUsage,
} from '@/lib/ai-client';

/** Minimal, safe markdown -> HTML (sanitized before render). */
function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(md).split('\n');
  const out: string[] = [];
  let inList = false;
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[0.85em]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) { out.push('<ul class="list-disc pl-5 space-y-1 my-2">'); inList = true; }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const size = ['text-lg', 'text-base', 'text-sm', 'text-sm'][h[1].length - 1];
      out.push(`<p class="${size} font-semibold mt-3 mb-1">${inline(h[2])}</p>`);
      continue;
    }
    if (!line.trim()) { out.push('<div class="h-2"></div>'); continue; }
    out.push(`<p class="my-1 leading-relaxed">${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return DOMPurify.sanitize(out.join(''), { USE_PROFILES: { html: true } });
}

function markdownToNoteHtml(md: string): string {
  return renderMarkdown(md);
}

const TASKS: { key: AiTask; label: string; icon: typeof Wand2; hint: string }[] = [
  { key: 'summarize', label: 'Summarize', icon: FileText, hint: 'Condense the selected notes' },
  { key: 'rewrite', label: 'Enhance', icon: Wand2, hint: 'Rewrite for clarity and structure' },
  { key: 'categorize', label: 'Categorize', icon: Tags, hint: 'Suggest category, subcategory, tags' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNoteId?: string;
}

export function AiAssistantDialog({ open, onOpenChange, initialNoteId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<AiUsage>({ used: 0, limit: 10 });
  const [filter, setFilter] = useState('');
  const [showPicker, setShowPicker] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const wsName = useCallback(
    (id: string) => workspaces.find(w => w.id === id)?.name ?? id,
    [workspaces],
  );

  const loadLocal = useCallback(async () => {
    const [n, w] = await Promise.all([getAllNotes(), getAllWorkspaces()]);
    setNotes(n);
    setWorkspaces(w);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await aiApi.sessions();
      setSessions(res.sessions);
      setUsage(res.usage);
    } catch (e: any) {
      toast({ title: 'AI unavailable', description: e?.message ?? 'Could not load sessions', variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadLocal();
    loadSessions();
    if (initialNoteId) { setSelected([initialNoteId]); setShowPicker(false); }
  }, [open, initialNoteId, loadLocal, loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const openSession = useCallback(async (id: string) => {
    try {
      const res = await aiApi.session(id);
      setSessionId(id);
      setMessages(res.messages);
      if (res.session.note_ids?.length) setSelected(res.session.note_ids);
      setShowPicker(false);
    } catch (e: any) {
      toast({ title: 'Could not open chat', description: e?.message, variant: 'destructive' });
    }
  }, []);

  const newSession = () => {
    setSessionId(null);
    setMessages([]);
    setPrompt('');
    setShowPicker(true);
  };

  const removeSession = async (id: string) => {
    try {
      await aiApi.deleteSession(id);
      setSessions(s => s.filter(x => x.id !== id));
      if (sessionId === id) newSession();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  const selectedNotes = useMemo(
    () => notes.filter(n => selected.includes(n.id)),
    [notes, selected],
  );

  const run = async (task: AiTask) => {
    if (selectedNotes.length === 0) {
      toast({ title: 'Select a note first', variant: 'destructive' });
      return;
    }
    if (task === 'chat' && !prompt.trim()) return;
    setBusy(true);
    const localPrompt = prompt.trim();
    try {
      const res = await aiApi.send({
        sessionId: sessionId ?? undefined,
        task,
        prompt: localPrompt,
        notes: selectedNotes.map(n => noteEnvelope(n, wsName(n.workspace))),
        categories: workspaces.map(w => w.name),
      });
      setSessionId(res.sessionId);
      setUsage(res.usage);
      setPrompt('');
      setShowPicker(false);
      const now = new Date().toISOString();
      setMessages(m => [
        ...m,
        {
          id: `u-${now}`, role: 'user', action: task, used_history: res.usedHistory, created_at: now,
          content: localPrompt || `[${task}] ${selectedNotes.map(n => n.title || 'Untitled').join(', ')}`,
          result: null,
        },
        { id: `a-${now}`, role: 'assistant', action: task, content: res.result.answer_markdown, result: res.result, used_history: res.usedHistory, created_at: now },
      ]);
      loadSessions();
    } catch (e: any) {
      toast({ title: 'AI request failed', description: e?.message ?? 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const applyRewrite = async (noteId: string, title: string, contentMd: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const updated: Note = {
      ...note,
      title: title || note.title,
      content: markdownToNoteHtml(contentMd),
      updatedAt: new Date(),
    };
    await saveNote(updated);
    setNotes(ns => ns.map(n => (n.id === noteId ? updated : n)));
    toast({ title: 'Note updated', description: 'The enhanced version was saved.' });
  };

  const applyCategory = async (noteId: string, workspaceName: string, subcategory: string, tags: string[]) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    let ws = workspaces.find(w => w.name.toLowerCase() === workspaceName.trim().toLowerCase());
    if (!ws && workspaceName.trim()) {
      ws = {
        id: generateId(),
        name: workspaceName.trim(),
        color: 'hsl(150 30% 28%)',
        icon: 'Folder',
        order: workspaces.length,
        createdAt: new Date(),
      };
      await saveWorkspace(ws);
      setWorkspaces(w => [...w, ws!]);
    }
    const updated: Note = {
      ...note,
      workspace: ws?.id ?? note.workspace,
      subcategory: subcategory || note.subcategory,
      tags: Array.from(new Set([...(note.tags ?? []), ...(tags ?? [])])).slice(0, 20),
      updatedAt: new Date(),
    };
    await saveNote(updated);
    setNotes(ns => ns.map(n => (n.id === noteId ? updated : n)));
    toast({ title: 'Category applied', description: `Moved to ${ws?.name ?? 'current workspace'}.` });
  };

  const filtered = notes.filter(n =>
    !filter.trim() || `${n.title} ${wsName(n.workspace)}`.toLowerCase().includes(filter.toLowerCase()),
  );

  const quotaLeft = Math.max(0, usage.limit - usage.used);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-none">Novaryn AI</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Admin pilot • note intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={quotaLeft > 0 ? 'secondary' : 'destructive'} className="text-[10px]">
              {quotaLeft}/{usage.limit} left today
            </Badge>
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sessions */}
          <aside className="hidden md:flex w-56 flex-col border-r bg-muted/20">
            <div className="p-2">
              <Button size="sm" className="w-full" onClick={newSession}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New chat
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-2 py-4">No chats yet.</p>
                )}
                {sessions.map(s => (
                  <div
                    key={s.id}
                    className={cn(
                      'group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs cursor-pointer',
                      sessionId === s.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                    )}
                    onClick={() => openSession(s.id)}
                  >
                    <History className="w-3 h-3 flex-shrink-0 opacity-60" />
                    <span className="truncate flex-1">{s.title}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Note selection */}
            <div className="border-b px-4 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 min-w-0">
                  {selectedNotes.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No notes selected</span>
                  ) : selectedNotes.map(n => (
                    <Badge key={n.id} variant="outline" className="text-[10px] max-w-[160px] truncate">
                      {n.title || 'Untitled'}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowPicker(p => !p)}>
                  {showPicker ? 'Hide notes' : 'Choose notes'}
                </Button>
              </div>
              {showPicker && (
                <div className="mt-2">
                  <Input
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter notes…"
                    className="h-8 text-xs"
                  />
                  <ScrollArea className="h-40 mt-2 rounded-md border">
                    <div className="p-1">
                      {filtered.map(n => {
                        const on = selected.includes(n.id);
                        return (
                          <button
                            key={n.id}
                            onClick={() =>
                              setSelected(s => (on ? s.filter(i => i !== n.id) : [...s, n.id].slice(0, 10)))
                            }
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2',
                              on ? 'bg-primary/10 text-foreground' : 'hover:bg-accent/50',
                            )}
                          >
                            <span className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center', on && 'bg-primary border-primary text-primary-foreground')}>
                              {on && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span className="truncate flex-1">{n.title || 'Untitled'}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{wsName(n.workspace)}</span>
                          </button>
                        );
                      })}
                      {filtered.length === 0 && <p className="text-[11px] text-muted-foreground p-3">No notes found.</p>}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Conversation */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {messages.length === 0 && !busy && (
                  <div className="text-center text-muted-foreground py-10">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Pick note(s), then summarize, enhance, categorize — or just ask.</p>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 max-w-[85%] text-sm',
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <>
                          <div
                            className="prose-sm"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                          />
                          <ResultActions
                            result={m.result}
                            onApplyRewrite={applyRewrite}
                            onApplyCategory={applyCategory}
                          />
                          {m.used_history && (
                            <p className="text-[10px] text-muted-foreground mt-2">used earlier context</p>
                          )}
                        </>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <Separator />

            {/* Composer */}
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {TASKS.map(t => (
                  <Button
                    key={t.key}
                    size="sm"
                    variant="outline"
                    disabled={busy || selectedNotes.length === 0 || quotaLeft === 0}
                    title={t.hint}
                    onClick={() => run(t.key)}
                  >
                    <t.icon className="w-3.5 h-3.5 mr-1" /> {t.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={quotaLeft === 0 ? 'Daily limit reached — resets at 00:00 UTC' : 'Ask about the selected note(s)…'}
                  className="min-h-[44px] max-h-32 text-sm"
                  disabled={busy || quotaLeft === 0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run('chat'); }
                  }}
                />
                <Button
                  size="icon"
                  disabled={busy || !prompt.trim() || selectedNotes.length === 0 || quotaLeft === 0}
                  onClick={() => run('chat')}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultActions({
  result, onApplyRewrite, onApplyCategory,
}: {
  result: AiResult | null;
  onApplyRewrite: (noteId: string, title: string, md: string) => void;
  onApplyCategory: (noteId: string, ws: string, sub: string, tags: string[]) => void;
}) {
  if (!result) return null;
  const rewrites = result.rewritten ?? [];
  const cats = result.categorization ?? [];
  if (rewrites.length === 0 && cats.length === 0) return null;
  return (
    <div className="mt-3 space-y-2 border-t pt-2">
      {rewrites.map(r => (
        <div key={`rw-${r.note_id}`} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate">Enhanced: <strong>{r.title || 'Untitled'}</strong></span>
          <Button size="sm" variant="secondary" className="h-6 text-[11px]"
            onClick={() => onApplyRewrite(r.note_id, r.title, r.content_markdown)}>
            Apply
          </Button>
        </div>
      ))}
      {cats.map(c => (
        <div key={`ct-${c.note_id}`} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate">
            → {c.workspace}{c.subcategory ? ` / ${c.subcategory}` : ''}
            {c.tags?.length ? ` • ${c.tags.map(t => `#${t}`).join(' ')}` : ''}
          </span>
          <Button size="sm" variant="secondary" className="h-6 text-[11px]"
            onClick={() => onApplyCategory(c.note_id, c.workspace, c.subcategory, c.tags ?? [])}>
            Apply
          </Button>
        </div>
      ))}
    </div>
  );
}
