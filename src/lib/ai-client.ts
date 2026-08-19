import { supabase } from "@/integrations/supabase/client";
import { getAdminDeviceId } from "@/lib/admin-client";
import type { Note } from "@/lib/db";

export type AiTask = "chat" | "summarize" | "rewrite" | "categorize";

export interface AiSession {
  id: string;
  title: string;
  note_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  action: AiTask;
  content: string;
  result: AiResult | null;
  used_history: boolean;
  created_at: string;
}

export interface AiRewrite {
  note_id: string;
  title: string;
  content_markdown: string;
}

export interface AiCategorization {
  note_id: string;
  workspace: string;
  subcategory: string;
  tags: string[];
  reason?: string;
}

export interface AiResult {
  answer_markdown: string;
  summary?: string | null;
  rewritten?: AiRewrite[] | null;
  categorization?: AiCategorization[] | null;
}

export interface AiUsage {
  used: number;
  limit: number;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<any>("ai-assistant", {
    body: {
      ...body,
      _device: {
        id: getAdminDeviceId(),
        ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
      },
    },
  });
  if (error) {
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        const err = new Error(parsed?.error || error.message);
        (err as any).code = parsed?.code;
        throw err;
      } catch (e) {
        if (e instanceof Error && (e as any).code !== undefined) throw e;
      }
    }
    throw new Error(error.message || "AI request failed");
  }
  if (data?.error) {
    const err = new Error(data.error);
    (err as any).code = data.code;
    throw err;
  }
  return data as T;
}

/** Strip HTML from stored note content so the model gets clean markdown-ish text. */
export function noteToPlainText(html: string): string {
  if (typeof document === "undefined") return html;
  const el = document.createElement("div");
  el.innerHTML = html;
  el.querySelectorAll("script,style").forEach((n) => n.remove());
  return (el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export function noteEnvelope(note: Note, workspaceName: string) {
  return {
    id: note.id,
    title: note.title,
    content: noteToPlainText(note.content),
    workspace: workspaceName,
    subcategory: note.subcategory,
    tags: note.tags ?? [],
    color: note.color,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
    hasMedia: /<img|<video|<audio/i.test(note.content),
  };
}

export const aiApi = {
  sessions: () => call<{ ok: true; sessions: AiSession[]; usage: AiUsage }>({ action: "sessions" }),
  session: (sessionId: string) =>
    call<{ ok: true; session: AiSession; messages: AiMessage[] }>({ action: "session", sessionId }),
  deleteSession: (sessionId: string) => call<{ ok: true }>({ action: "deleteSession", sessionId }),
  renameSession: (sessionId: string, title: string) =>
    call<{ ok: true }>({ action: "renameSession", sessionId, title }),
  send: (p: {
    sessionId?: string;
    task: AiTask;
    prompt: string;
    notes: ReturnType<typeof noteEnvelope>[];
    categories: string[];
  }) =>
    call<{ ok: true; sessionId: string; usedHistory: boolean; result: AiResult; usage: AiUsage }>({
      action: "send",
      ...p,
    }),
};
