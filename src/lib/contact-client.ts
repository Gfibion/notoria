import { supabase } from "@/integrations/supabase/client";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketReason = "issue" | "concern" | "recommend" | "other";

export interface TicketSummary {
  ticket_number: string;
  reason: TicketReason;
  subject: string;
  status: TicketStatus;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}
export interface TicketMessage {
  id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
}
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  updated_at: string;
}

const LS_KEY = "notoria_my_tickets_v1";

export interface LocalTicket {
  ticketNumber: string;
  accessToken: string;
  subject: string;
  reason: TicketReason;
  createdAt: string;
}

export function loadLocalTickets(): LocalTicket[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
export function saveLocalTicket(t: LocalTicket) {
  const arr = loadLocalTickets().filter(x => x.ticketNumber !== t.ticketNumber);
  arr.unshift(t);
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 50))); } catch {}
}
export function getLocalTicket(ticketNumber: string): LocalTicket | null {
  return loadLocalTickets().find(t => t.ticketNumber === ticketNumber) ?? null;
}
export function removeLocalTicket(ticketNumber: string) {
  const arr = loadLocalTickets().filter(t => t.ticketNumber !== ticketNumber);
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

async function call<T>(fn: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<any>(fn, { body });
  if (error) {
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        throw new Error(parsed?.error || error.message);
      } catch (e) { if (e instanceof Error) throw e; }
    }
    throw new Error(error.message || `${fn} failed`);
  }
  if (data && data.error) throw new Error(data.error);
  return data as T;
}

export const REASON_LABELS: Record<TicketReason, string> = {
  issue: "Report an issue",
  concern: "Share a concern",
  recommend: "Make a recommendation",
  other: "Something else",
};

export const REASON_TEMPLATES: Record<TicketReason, { subject: string; body: string }> = {
  issue: {
    subject: "Issue: ",
    body: "**What happened**\n\n\n**Steps to reproduce**\n1. \n2. \n3. \n\n**What I expected**\n\n\n**Device / browser**\n",
  },
  concern: {
    subject: "Concern: ",
    body: "**My concern**\n\n\n**Why it matters to me**\n",
  },
  recommend: {
    subject: "Recommendation: ",
    body: "**What I'd like to see**\n\n\n**Why it would help**\n",
  },
  other: {
    subject: "",
    body: "",
  },
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const contactApi = {
  createTicket: (p: { reason: TicketReason; subject: string; body: string; contactEmail?: string; userHash?: string }) =>
    call<{ ok: true; ticketNumber: string; accessToken: string }>("contact-create-ticket", p),
  getTicket: (ticketNumber: string, accessToken: string) =>
    call<{ ok: true; ticket: TicketSummary; messages: TicketMessage[] }>("contact-get-ticket", { ticketNumber, accessToken }),
  addMessage: (ticketNumber: string, accessToken: string, body: string) =>
    call<{ ok: true }>("contact-add-message", { ticketNumber, accessToken, body }),
  listFaqs: () => call<{ ok: true; faqs: FaqItem[] }>("contact-list-faqs"),
};
