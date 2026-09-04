// Novaryn AI assistant — ADMIN DEVICE ONLY (pilot).
// Summarize / rewrite / categorize notes with Gemini via the Lovable AI Gateway.
// Sessions + message memory live in ai_sessions / ai_messages, capped at
// AI_DAILY_LIMIT forwarded requests per admin per UTC day.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

const MODEL = "google/gemini-3.7-flash";
const AI_DAILY_LIMIT = 10;
const MAX_NOTES = 10;
const MAX_NOTE_CHARS = 20_000;
const MAX_TOTAL_CHARS = 120_000;
const HISTORY_TURNS = 8;

type Task = "chat" | "summarize" | "rewrite" | "categorize";
const TASKS: Task[] = ["chat", "summarize", "rewrite", "categorize"];

interface NoteInput {
  id: string;
  title: string;
  content: string;
  workspace?: string;
  subcategory?: string;
  tags?: string[];
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  hasMedia?: boolean;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function sanitizeNotes(raw: unknown): { notes: NoteInput[]; error?: string } {
  if (raw === undefined || raw === null) return { notes: [] };
  if (!Array.isArray(raw)) return { notes: [], error: "notes must be an array" };
  if (raw.length === 0) return { notes: [] };
  if (raw.length > MAX_NOTES) return { notes: [], error: `At most ${MAX_NOTES} notes per request` };
  let total = 0;
  const notes: NoteInput[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const content = str(r?.content, MAX_NOTE_CHARS);
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return { notes: [], error: "Selected notes are too large" };
    notes.push({
      id: str(r?.id, 100),
      title: str(r?.title, 300),
      content,
      workspace: str(r?.workspace, 120),
      subcategory: str(r?.subcategory, 120),
      tags: Array.isArray(r?.tags) ? (r!.tags as unknown[]).slice(0, 30).map((t) => str(t, 60)) : [],
      color: str(r?.color, 40),
      createdAt: str(r?.createdAt, 40),
      updatedAt: str(r?.updatedAt, 40),
      hasMedia: !!r?.hasMedia,
    });
  }
  return { notes };
}

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

interface Attachment {
  name: string;
  mime: string;
  kind: "text" | "image" | "pdf";
  text?: string;
  dataUrl?: string;
}

function sanitizeAttachments(raw: unknown): { files: Attachment[]; error?: string } {
  if (raw === undefined || raw === null) return { files: [] };
  if (!Array.isArray(raw)) return { files: [], error: "attachments must be an array" };
  if (raw.length > MAX_ATTACHMENTS) return { files: [], error: `At most ${MAX_ATTACHMENTS} files per request` };
  const files: Attachment[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const kind = str(r?.kind, 10);
    if (kind !== "text" && kind !== "image" && kind !== "pdf") {
      return { files: [], error: "Unsupported file type" };
    }
    const name = str(r?.name, 200) || "file";
    if (kind === "text") {
      const text = str(r?.text, 200_000);
      if (!text) return { files: [], error: `${name}: file is empty` };
      files.push({ name, mime: str(r?.mime, 100) || "text/plain", kind, text });
      continue;
    }
    const dataUrl = str(r?.dataUrl, 12_000_000);
    if (!dataUrl.startsWith("data:")) return { files: [], error: `${name}: invalid file data` };
    const b64 = dataUrl.split(",")[1] ?? "";
    if (!b64) return { files: [], error: `${name}: file is empty` };
    if (Math.floor(b64.length * 0.75) > MAX_ATTACHMENT_BYTES) {
      return { files: [], error: `${name}: file is larger than 5 MB` };
    }
    files.push({ name, mime: str(r?.mime, 100), kind, dataUrl });
  }
  return { files };
}


/** Cheap, local decision: does this new prompt actually need earlier turns? */
function needsHistory(task: Task, prompt: string): boolean {
  if (task !== "chat") return false;
  const p = prompt.toLowerCase();
  return /\b(previous|earlier|before|again|that|those|it|this|your last|you said|the summary|redo|instead|continue|refine|shorter|longer|expand|also|follow ?up|as above)\b/.test(p);
}

const SYSTEM_PROMPT = `You are Novaryn's note intelligence assistant.
You receive a JSON envelope of one or more notes with their metadata (workspace/category, subcategory, tags, colors, timestamps, media flags) and a task.

Rules:
- Preserve the author's voice, facts and intent. Never invent content that is not in the notes.
- Markdown is the rendering format for prose: headings, bullets, bold, tables. Never emit raw HTML or scripts.
- Keep each note's identity: always reference notes by their note_id.
- When suggesting categories, prefer categories that already exist in the provided workspace list; propose a new one only when nothing fits.
- Be concise and executive in tone: Novaryn users organise thoughts to shape decisions.

Respond with a single JSON object ONLY, matching:
{
  "answer_markdown": string,                       // always: the human-facing answer in Markdown
  "summary": string | null,                        // summarize task: overall markdown summary
  "rewritten": [{"note_id": string, "title": string, "content_markdown": string}] | null,
  "categorization": [{"note_id": string, "workspace": string, "subcategory": string, "tags": [string], "reason": string}] | null
}
Set unused fields to null.`;

function taskInstruction(task: Task): string {
  switch (task) {
    case "summarize":
      return "Task: SUMMARIZE. Produce a per-note summary plus, when several notes are given, one cross-note synthesis with key decisions and action points. Fill answer_markdown and summary.";
    case "rewrite":
      return "Task: REWRITE/ENHANCE. Improve clarity, structure and grammar without changing meaning. Return the full improved note body in Markdown for each note in rewritten[], and a short note of what changed in answer_markdown.";
    case "categorize":
      return "Task: CATEGORIZE. Suggest the best workspace (category), an optional subcategory and up to 5 hashtags per note. Fill categorization[] and explain briefly in answer_markdown.";
    default:
      return "Task: CHAT. Answer the user's question about the provided note(s).";
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* ignore */ }
    }
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.admin) return json({ error: "Admin only" }, 403);

  const adminId = ctx.admin.id;
  const service = ctx.service;
  const action = String(ctx.body?.action ?? "");

  const today = new Date().toISOString().slice(0, 10);
  const usage = async () => {
    const { data } = await service
      .from("ai_usage").select("count").eq("admin_id", adminId).eq("day", today).maybeSingle();
    return { used: (data as { count?: number } | null)?.count ?? 0, limit: AI_DAILY_LIMIT };
  };

  if (action === "sessions") {
    const { data } = await service
      .from("ai_sessions")
      .select("id, title, note_ids, created_at, updated_at")
      .eq("admin_id", adminId)
      .order("updated_at", { ascending: false })
      .limit(100);
    return json({ ok: true, sessions: data ?? [], usage: await usage() });
  }

  if (action === "session") {
    const sessionId = String(ctx.body?.sessionId ?? "");
    if (!sessionId) return json({ error: "sessionId required" }, 400);
    const { data: session } = await service
      .from("ai_sessions").select("*").eq("id", sessionId).eq("admin_id", adminId).maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);
    const { data: messages } = await service
      .from("ai_messages")
      .select("id, role, action, content, result, used_history, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    return json({ ok: true, session, messages: messages ?? [] });
  }

  if (action === "createSession") {
    const title = str(ctx.body?.title, 120) || "New chat";
    const noteIds = Array.isArray(ctx.body?.noteIds)
      ? (ctx.body!.noteIds as unknown[]).slice(0, MAX_NOTES).map((n) => str(n, 100))
      : [];
    const { data, error } = await service
      .from("ai_sessions").insert({ admin_id: adminId, title, note_ids: noteIds })
      .select("id, title, note_ids, created_at, updated_at").single();
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, session: data });
  }

  if (action === "deleteSession") {
    const sessionId = String(ctx.body?.sessionId ?? "");
    if (!sessionId) return json({ error: "sessionId required" }, 400);
    const { error } = await service
      .from("ai_sessions").delete().eq("id", sessionId).eq("admin_id", adminId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action === "renameSession") {
    const sessionId = String(ctx.body?.sessionId ?? "");
    const title = str(ctx.body?.title, 120);
    if (!sessionId || !title) return json({ error: "sessionId and title required" }, 400);
    const { error } = await service
      .from("ai_sessions").update({ title }).eq("id", sessionId).eq("admin_id", adminId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action !== "send") return json({ error: "Unknown action" }, 400);

  // ---- send ---------------------------------------------------------------
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured on this project." }, 500);

  const task = (TASKS.includes(ctx.body?.task as Task) ? ctx.body!.task : "chat") as Task;
  const prompt = str(ctx.body?.prompt, 4000).trim();
  if (task === "chat" && !prompt) return json({ error: "Enter a question" }, 400);

  const { notes, error: noteErr } = sanitizeNotes(ctx.body?.notes);
  if (noteErr) return json({ error: noteErr }, 400);

  const existingCategories = Array.isArray(ctx.body?.categories)
    ? (ctx.body!.categories as unknown[]).slice(0, 100).map((c) => str(c, 120))
    : [];

  let sessionId = String(ctx.body?.sessionId ?? "");
  if (sessionId) {
    const { data: s } = await service
      .from("ai_sessions").select("id").eq("id", sessionId).eq("admin_id", adminId).maybeSingle();
    if (!s) return json({ error: "Session not found" }, 404);
  } else {
    const { data: s, error } = await service.from("ai_sessions").insert({
      admin_id: adminId,
      title: (notes[0]?.title || prompt || "New chat").slice(0, 120),
      note_ids: notes.map((n) => n.id),
    }).select("id").single();
    if (error || !s) return json({ error: error?.message ?? "Could not open session" }, 400);
    sessionId = (s as { id: string }).id;
  }

  // Daily quota (atomic).
  const { data: allowed, error: quotaErr } = await service.rpc("bump_ai_usage", {
    _admin_id: adminId, _limit: AI_DAILY_LIMIT,
  });
  if (quotaErr) return json({ error: "Could not verify your AI quota. Try again." }, 500);
  if (allowed !== true) {
    return json({
      error: `Daily AI limit reached (${AI_DAILY_LIMIT} requests per day). It resets at 00:00 UTC.`,
      code: "quota_exceeded",
    }, 429);
  }
  const refund = async () => {
    const { data } = await service
      .from("ai_usage").select("count").eq("admin_id", adminId).eq("day", today).maybeSingle();
    const c = (data as { count?: number } | null)?.count ?? 0;
    if (c > 0) await service.from("ai_usage").update({ count: c - 1 }).eq("admin_id", adminId).eq("day", today);
  };

  // Memory: only pulled in when the new question actually depends on it.
  const useHistory = needsHistory(task, prompt);
  const messages: Array<{ role: string; content: string }> = [{ role: "system", content: SYSTEM_PROMPT }];

  if (useHistory) {
    const { data: prior } = await service
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_TURNS);
    const hist = (prior ?? []).reverse() as Array<{ role: string; content: string }>;
    for (const m of hist) {
      messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 6000) });
    }
  }

  const envelope = {
    task,
    existing_categories: existingCategories,
    notes: notes.map((n) => ({
      note_id: n.id,
      title: n.title,
      workspace: n.workspace,
      subcategory: n.subcategory,
      tags: n.tags,
      created_at: n.createdAt,
      updated_at: n.updatedAt,
      has_media: n.hasMedia,
      content_markdown: n.content,
    })),
  };

  messages.push({
    role: "user",
    content: `${taskInstruction(task)}\n\nUser request: ${prompt || "(none — perform the task)"}\n\nNotes envelope (JSON):\n${JSON.stringify(envelope)}`,
  });

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: "json_object" },
      }),
    });
  } catch (_e) {
    await refund();
    return json({ error: "Could not reach the AI service. Try again." }, 502);
  }

  if (!res.ok) {
    await refund();
    const text = await res.text().catch(() => "");
    if (res.status === 429) return json({ error: "The AI service is rate limited. Try again in a moment.", code: "rate_limited" }, 429);
    if (res.status === 402) return json({ error: "AI credits are exhausted for this workspace.", code: "payment_required" }, 402);
    console.error("gateway error", res.status, text.slice(0, 500));
    return json({ error: `AI request failed (${res.status}).` }, 502);
  }

  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(String(raw));
  const result = parsed ?? { answer_markdown: String(raw).slice(0, 20000), summary: null, rewritten: null, categorization: null };
  const answer = typeof result.answer_markdown === "string" && result.answer_markdown.trim()
    ? result.answer_markdown
    : (typeof result.summary === "string" ? result.summary : "The AI returned no readable answer.");

  const userLabel = prompt || `[${task}] ${notes.map((n) => n.title || "Untitled").join(", ")}`;
  await service.from("ai_messages").insert([
    { session_id: sessionId, role: "user", action: task, content: userLabel, used_history: useHistory },
    { session_id: sessionId, role: "assistant", action: task, content: answer, result, used_history: useHistory },
  ]);
  await service.from("ai_sessions").update({
    updated_at: new Date().toISOString(),
    note_ids: notes.map((n) => n.id),
  }).eq("id", sessionId).eq("admin_id", adminId);

  return json({
    ok: true,
    sessionId,
    usedHistory: useHistory,
    result: { ...result, answer_markdown: answer },
    usage: await usage(),
  });
});
