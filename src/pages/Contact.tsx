import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, Ticket, RefreshCw, Plus, Copy, Mail, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import {
  contactApi, loadLocalTickets, saveLocalTicket, getLocalTicket, removeLocalTicket,
  REASON_LABELS, REASON_TEMPLATES, STATUS_LABELS,
  type LocalTicket, type TicketReason, type TicketStatus, type FaqItem, type TicketMessage, type TicketSummary,
} from "@/lib/contact-client";

function statusVariant(s: TicketStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "open") return "default";
  if (s === "in_progress") return "secondary";
  if (s === "resolved") return "outline";
  return "outline";
}

function NewTicketForm({ onCreated }: { onCreated: (t: LocalTicket) => void }) {
  const [reason, setReason] = useState<TicketReason>("issue");
  const [subject, setSubject] = useState(REASON_TEMPLATES.issue.subject);
  const [body, setBody] = useState(REASON_TEMPLATES.issue.body);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const subjectTouched = useRef(false);
  const bodyTouched = useRef(false);

  const applyTemplate = (r: TicketReason) => {
    setReason(r);
    if (!subjectTouched.current) setSubject(REASON_TEMPLATES[r].subject);
    if (!bodyTouched.current) setBody(REASON_TEMPLATES[r].body);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await contactApi.createTicket({
        reason, subject: subject.trim(), body: body.trim(),
        contactEmail: email.trim() || undefined,
      });
      const local: LocalTicket = {
        ticketNumber: r.ticketNumber, accessToken: r.accessToken,
        subject: subject.trim(), reason, createdAt: new Date().toISOString(),
      };
      saveLocalTicket(local);
      toast.success(`Ticket #${r.ticketNumber} created`);
      // reset
      subjectTouched.current = false;
      bodyTouched.current = false;
      setSubject(REASON_TEMPLATES[reason].subject);
      setBody(REASON_TEMPLATES[reason].body);
      onCreated(local);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create ticket");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label>What's this about?</Label>
        <Select value={reason} onValueChange={(v) => applyTemplate(v as TicketReason)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(REASON_LABELS) as TicketReason[]).map(r => (
              <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subj">Subject</Label>
        <Input id="subj" value={subject} maxLength={200}
          onChange={e => { subjectTouched.current = true; setSubject(e.target.value); }} required />
      </div>
      <div>
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" value={body} maxLength={5000} rows={9}
          onChange={e => { bodyTouched.current = true; setBody(e.target.value); }} required
          placeholder="Describe it here…" />
        <p className="text-xs text-muted-foreground mt-1">Template fills automatically — edit it to fit your situation.</p>
      </div>
      <div>
        <Label htmlFor="email">Email (optional, for replies)</Label>
        <Input id="email" type="email" value={email} maxLength={255}
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : <><Plus className="w-4 h-4 mr-1" /> Open ticket</>}
      </Button>
    </form>
  );
}

function TicketChat({ ticketNumber, accessToken, onBack }: { ticketNumber: string; accessToken: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketSummary | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await contactApi.getTicket(ticketNumber, accessToken);
      setTicket(r.ticket);
      setMessages(r.messages);
      setNotFound(false);
    } catch (e: any) {
      if (String(e?.message).toLowerCase().includes("not found")) setNotFound(true);
      else toast.error(e?.message ?? "Failed to load ticket");
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [ticketNumber, accessToken]);
  useEffect(() => {
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [ticketNumber, accessToken]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await contactApi.addMessage(ticketNumber, accessToken, reply.trim());
      setReply("");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Failed to send"); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="text-muted-foreground">Loading ticket…</p>;
  if (notFound) return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p>Ticket not found or the access link is invalid on this device.</p>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      </CardContent>
    </Card>
  );
  if (!ticket) return null;

  const closed = ticket.status === "closed";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4" /> #{ticket.ticket_number}
              <Badge variant={statusVariant(ticket.status)} className="text-[10px]">{STATUS_LABELS[ticket.status]}</Badge>
            </CardTitle>
            <CardDescription className="break-words">{ticket.subject}</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                {m.body}
                <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {closed ? (
          <p className="text-xs text-muted-foreground">This ticket is closed. Open a new one if you need further help.</p>
        ) : (
          <form onSubmit={send} className="flex gap-2 items-end">
            <Textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
              placeholder="Type a reply…" maxLength={5000}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e as any); }} />
            <Button type="submit" disabled={busy || !reply.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
      </CardContent>
    </Card>
  );
}

function MyTickets({ onOpen }: { onOpen: (t: LocalTicket) => void }) {
  const [list, setList] = useState<LocalTicket[]>([]);
  useEffect(() => { setList(loadLocalTickets()); }, []);
  if (list.length === 0) return <p className="text-muted-foreground text-sm">No tickets yet on this device.</p>;
  return (
    <div className="space-y-2">
      {list.map(t => (
        <div key={t.ticketNumber} className="border rounded-md p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">#{t.ticketNumber}</p>
            <p className="text-sm truncate">{t.subject || "(no subject)"}</p>
            <p className="text-[11px] text-muted-foreground">{REASON_LABELS[t.reason]} • {new Date(t.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => onOpen(t)}>Open</Button>
            <Button size="sm" variant="ghost" onClick={() => { removeLocalTicket(t.ticketNumber); setList(loadLocalTickets()); }}>×</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LookupForm({ onOpen }: { onOpen: (n: string, tok: string) => void }) {
  const [num, setNum] = useState("");
  const [tok, setTok] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onOpen(num.trim(), tok.trim()); }} className="space-y-2">
      <div>
        <Label htmlFor="tn">Ticket number</Label>
        <Input id="tn" value={num} onChange={e => setNum(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="e.g. 12345678" />
      </div>
      <div>
        <Label htmlFor="tk">Access token</Label>
        <Input id="tk" value={tok} onChange={e => setTok(e.target.value.trim())} placeholder="From your saved tickets" className="font-mono text-xs" />
      </div>
      <Button type="submit" disabled={!num || !tok} className="w-full">Open ticket</Button>
    </form>
  );
}

function FaqList() {
  const [faqs, setFaqs] = useState<FaqItem[] | null>(null);
  useEffect(() => {
    contactApi.listFaqs().then(r => setFaqs(r.faqs)).catch(() => setFaqs([]));
  }, []);
  if (!faqs) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (faqs.length === 0) return <p className="text-muted-foreground text-sm">No FAQs published yet.</p>;
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map(f => (
        <AccordionItem key={f.id} value={f.id}>
          <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
          <AccordionContent>
            <p className="whitespace-pre-wrap text-sm">{f.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState("faq");
  const [active, setActive] = useState<{ num: string; tok: string } | null>(null);

  const openFromLocal = (t: LocalTicket) => setActive({ num: t.ticketNumber, tok: t.accessToken });
  const openByLookup = (num: string, tok: string) => setActive({ num, tok });
  const onCreated = (t: LocalTicket) => setActive({ num: t.ticketNumber, tok: t.accessToken });

  return (
    <>
      <SEO
        path="/contact"
        title="Contact & Support"
        description="Get help with Novaryn. Browse FAQs or open a private support ticket — our team responds to questions from executives, researchers, and everyday thinkers."
        keywords="Novaryn support, contact, help, FAQ, customer service"
      />
    <div className="min-h-screen bg-background">

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
          <h1 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> Contact &amp; support</h1>
          <div />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {active ? (
          <TicketChat ticketNumber={active.num} accessToken={active.tok} onBack={() => setActive(null)} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="faq"><HelpCircle className="w-3.5 h-3.5 mr-1" />FAQ</TabsTrigger>
              <TabsTrigger value="new"><Plus className="w-3.5 h-3.5 mr-1" />New ticket</TabsTrigger>
              <TabsTrigger value="mine"><MessageSquare className="w-3.5 h-3.5 mr-1" />My tickets</TabsTrigger>
              <TabsTrigger value="lookup"><Ticket className="w-3.5 h-3.5 mr-1" />Lookup</TabsTrigger>
            </TabsList>

            <TabsContent value="faq" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Frequently asked questions</CardTitle>
                  <CardDescription>Curated from real conversations. Updated by the team.</CardDescription>
                </CardHeader>
                <CardContent><FaqList /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Start a conversation</CardTitle>
                  <CardDescription>Choose a reason — we'll pre-fill a template so you only fill in the blanks.</CardDescription>
                </CardHeader>
                <CardContent><NewTicketForm onCreated={onCreated} /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mine" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">My tickets (this device)</CardTitle>
                  <CardDescription>Tickets are tied to a private access token saved on this device.</CardDescription>
                </CardHeader>
                <CardContent><MyTickets onOpen={openFromLocal} /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lookup" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Open a ticket from another device</CardTitle>
                  <CardDescription>Paste your ticket number and access token.</CardDescription>
                </CardHeader>
                <CardContent><LookupForm onOpen={openByLookup} /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
