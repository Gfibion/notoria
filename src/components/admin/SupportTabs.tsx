import { useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, RefreshCw, Send, Ticket, Star, Edit, Trash2, Plus, EyeOff, Eye } from "lucide-react";

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const STATUS_LABEL: Record<string, string> = {
  open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed",
};
const REASON_LABEL: Record<string, string> = {
  issue: "Issue", concern: "Concern", recommend: "Recommendation", other: "Other",
};

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "open") return "default";
  if (s === "in_progress") return "secondary";
  return "outline";
}

function TicketChatPanel({ ticketId, onChanged, onClose, onPromote }: {
  ticketId: string; onChanged: () => void; onClose: () => void;
  onPromote: (t: { question: string; answer: string; sourceTicketId: string }) => void;
}) {
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await adminApi.ticketGet(ticketId);
      setTicket(r.ticket); setMessages(r.messages);
    } catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [ticketId]);
  useEffect(() => {
    const id = setInterval(load, 8000); return () => clearInterval(id);
    // eslint-disable-next-line
  }, [ticketId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await adminApi.ticketReply(ticketId, reply.trim());
      setReply(""); await load(); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed to send"); }
    finally { setBusy(false); }
  };

  const changeStatus = async (s: string) => {
    try { await adminApi.ticketStatus(ticketId, s); toast.success(`Status: ${STATUS_LABEL[s]}`); await load(); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  if (loading || !ticket) return <p className="text-muted-foreground">Loading…</p>;

  const lastUserMsg = [...messages].reverse().find(m => m.sender === "user");
  const lastAdminMsg = [...messages].reverse().find(m => m.sender === "admin");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <Ticket className="w-4 h-4" /> #{ticket.ticket_number}
              <Badge variant={statusVariant(ticket.status)} className="text-[10px]">{STATUS_LABEL[ticket.status]}</Badge>
              <Badge variant="outline" className="text-[10px]">{REASON_LABEL[ticket.reason] ?? ticket.reason}</Badge>
            </CardTitle>
            <CardDescription className="break-words">{ticket.subject}</CardDescription>
            {ticket.contact_email && <p className="text-xs text-muted-foreground mt-1">✉ {ticket.contact_email}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs">Status</Label>
          <Select value={ticket.status} onValueChange={changeStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          {lastUserMsg && lastAdminMsg && (
            <Button size="sm" variant="outline" onClick={() => onPromote({
              question: ticket.subject,
              answer: lastAdminMsg.body,
              sourceTicketId: ticket.id,
            })}>
              <Star className="w-3 h-3 mr-1" /> Publish as FAQ
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                m.sender === "admin"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                {m.body}
                <div className="text-[10px] opacity-70 mt-1">
                  {m.sender === "admin" ? "you" : "user"} • {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {ticket.status !== "closed" ? (
          <form onSubmit={send} className="flex gap-2 items-end">
            <Textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
              placeholder="Reply to user… (Ctrl/⌘+Enter to send)" maxLength={5000}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e as any); }} />
            <Button type="submit" disabled={busy || !reply.trim()}><Send className="w-4 h-4" /></Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">Ticket is closed. Reopen by changing status.</p>
        )}
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
      </CardContent>
    </Card>
  );
}

export function SupportTab({ openFaqEditor }: { openFaqEditor: (seed: { question: string; answer: string; sourceTicketId?: string }) => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [active, setActive] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await adminApi.ticketsList(); setTickets(r.tickets); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load tickets"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = tickets.filter(t => filter === "all" ? true : t.status === filter);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
        </div>
        {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : (
          filtered.length === 0 ? <p className="text-muted-foreground text-sm">No tickets.</p> : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map(t => {
                const isActive = active === t.id;
                const needsReply = t.last_sender === "user" && t.status !== "closed";
                return (
                  <button key={t.id} onClick={() => setActive(t.id)}
                    className={`w-full text-left border rounded-md p-2 hover:bg-muted/40 transition ${isActive ? "ring-2 ring-primary" : ""}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">#{t.ticket_number}</span>
                      <Badge variant={statusVariant(t.status)} className="text-[10px]">{STATUS_LABEL[t.status]}</Badge>
                      <Badge variant="outline" className="text-[10px]">{REASON_LABEL[t.reason] ?? t.reason}</Badge>
                      {needsReply && <Badge className="text-[10px] bg-amber-500 text-white">Needs reply</Badge>}
                    </div>
                    <p className="text-sm truncate mt-1">{t.subject}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.message_count} msg • updated {new Date(t.updated_at).toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
      <div>
        {active ? (
          <TicketChatPanel
            ticketId={active}
            onChanged={load}
            onClose={() => setActive(null)}
            onPromote={(p) => openFaqEditor(p)}
          />
        ) : (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
            Select a ticket to open the chat.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

interface FaqEditorState {
  open: boolean;
  id?: string;
  question: string;
  answer: string;
  published: boolean;
  sortOrder: number;
  sourceTicketId?: string;
}

export function FaqsTab({ editor, setEditor }: { editor: FaqEditorState; setEditor: (s: FaqEditorState) => void }) {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await adminApi.faqsList(); setFaqs(r.faqs); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await adminApi.faqUpsert({
        id: editor.id, question: editor.question.trim(), answer: editor.answer.trim(),
        published: editor.published, sortOrder: editor.sortOrder, sourceTicketId: editor.sourceTicketId,
      });
      toast.success(editor.id ? "FAQ updated" : "FAQ published");
      setEditor({ ...editor, open: false });
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try { await adminApi.faqDelete(id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const togglePublish = async (f: any) => {
    try {
      await adminApi.faqUpsert({
        id: f.id, question: f.question, answer: f.answer,
        published: !f.published, sortOrder: f.sort_order,
      });
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Publish FAQs shown on the public Contact page.</p>
        <Button size="sm" onClick={() => setEditor({ open: true, question: "", answer: "", published: true, sortOrder: 0 })}>
          <Plus className="w-4 h-4 mr-1" /> New FAQ
        </Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : (
        faqs.length === 0 ? <p className="text-muted-foreground text-sm">No FAQs yet.</p> : (
          <div className="space-y-2">
            {faqs.map(f => (
              <Card key={f.id}>
                <CardContent className="p-3 flex items-start gap-2 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm break-words">{f.question}</p>
                      {!f.published && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                      <Badge variant="outline" className="text-[10px]">order {f.sort_order}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 mt-1">{f.answer}</p>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => togglePublish(f)} title={f.published ? "Hide" : "Publish"}>
                      {f.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditor({
                      open: true, id: f.id, question: f.question, answer: f.answer,
                      published: f.published, sortOrder: f.sort_order, sourceTicketId: f.source_ticket_id ?? undefined,
                    })}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <Dialog open={editor.open} onOpenChange={(o) => setEditor({ ...editor, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editor.id ? "Edit FAQ" : "Publish FAQ"}</DialogTitle>
            <DialogDescription>Visible to everyone on the Contact page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Question</Label>
              <Input value={editor.question} onChange={e => setEditor({ ...editor, question: e.target.value })} maxLength={300} />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea value={editor.answer} onChange={e => setEditor({ ...editor, answer: e.target.value })} rows={6} maxLength={5000} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={editor.published} onCheckedChange={(v) => setEditor({ ...editor, published: v })} />
                <Label className="m-0">Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="m-0">Sort order</Label>
                <Input type="number" className="w-20" value={editor.sortOrder}
                  onChange={e => setEditor({ ...editor, sortOrder: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor({ ...editor, open: false })}>Cancel</Button>
            <Button onClick={save} disabled={!editor.question.trim() || !editor.answer.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { FaqEditorState };
