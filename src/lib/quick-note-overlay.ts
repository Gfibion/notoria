/**
 * Novaryn "Display over other apps" quick note.
 *
 * Uses the Document Picture-in-Picture API (Chromium desktop) to open a small
 * always-on-top window that floats over other apps while the user works.
 * The window is natively repositionable and resizable by the OS.
 *
 * Architecture:
 * - The floating window is a separate same-origin document. It never touches
 *   the database directly; it posts messages over a BroadcastChannel to the
 *   host (main app window), which persists via the normal db layer and fires
 *   the `notes-changed` event so all views refresh.
 * - Autosave: 2s after the last keystroke, on Maximize and on window close —
 *   mirroring the main editor autosave rule.
 * - A brand-new quick note is only created once it has content, so launching
 *   and abandoning an empty overlay leaves no empty note behind.
 * - Maximize: saves, then asks the app to open the note in the full editor.
 */

import DOMPurify from 'dompurify';
import { Note, getNote, saveNote, generateId } from '@/lib/db';

const CHANNEL = 'novaryn-quick-note';
export const QUICK_NOTE_SESSION_KEY = 'novaryn-quick-note-open';

const SANITIZE_OPTS = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span', 'div', 'mark', 'code', 'pre', 'blockquote', 'strong', 'em', 'img', 'sup'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height', 'data-pdf-metadata', 'title'],
};

type OverlayToHost =
  | { t: 'save'; rid: number; noteId: string | null; title: string; html: string }
  | { t: 'maximize'; rid: number; noteId: string | null; title: string; html: string }
  | { t: 'closed'; rid: number; noteId: string | null; title: string; html: string };

type HostToOverlay = { t: 'saved'; rid: number; noteId: string | null };

export type OverlayOpenResult =
  | { ok: true; reused?: boolean }
  | { ok: false; reason: 'unsupported' | 'error'; message?: string };

export function isOverlaySupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

// ---------------- host (main app window) ----------------

let hostChannel: BroadcastChannel | null = null;

/** Idempotent. Call once at app boot. */
export function initQuickNoteHost(): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__novarynQuickNoteHost) return;
  w.__novarynQuickNoteHost = true;

  hostChannel = new BroadcastChannel(CHANNEL);
  hostChannel.onmessage = (ev: MessageEvent) => {
    const msg = ev.data as OverlayToHost;
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'save') {
      void persistAndAck(msg as Extract<OverlayToHost, { t: 'save' }>);
    } else if (msg.t === 'maximize') {
      void handleMaximize(msg as Extract<OverlayToHost, { t: 'maximize' }>);
    } else if (msg.t === 'closed') {
      void persistNote((msg as Extract<OverlayToHost, { t: 'closed' }>).noteId, msg.title, msg.html);
    }
  };
}

async function persistAndAck(msg: Extract<OverlayToHost, { t: 'save' }>): Promise<void> {
  const noteId = await persistNote(msg.noteId, msg.title, msg.html);
  hostChannel?.postMessage({ t: 'saved', rid: msg.rid, noteId } as HostToOverlay);
}

async function persistNote(noteId: string | null, title: string, html: string): Promise<string | null> {
  try {
    const clean = DOMPurify.sanitize(html || '', SANITIZE_OPTS);
    const now = new Date();
    if (noteId) {
      const existing = await getNote(noteId);
      if (!existing || existing.isDeleted) return null;
      await saveNote({
        ...existing,
        title: title.trim() || existing.title,
        content: clean,
        updatedAt: now,
      });
      window.dispatchEvent(new Event('notes-changed'));
      return noteId;
    }
    const text = clean.replace(/<[^>]*>/g, ' ').trim();
    if (!text && !title.trim()) return null; // nothing worth creating
    const note: Note = {
      id: generateId(),
      title: title.trim() || 'Quick Note',
      content: clean,
      workspace: '',
      subcategory: '',
      color: '',
      isPinned: false,
      isStarred: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      tags: [],
    };
    await saveNote(note);
    window.dispatchEvent(new Event('notes-changed'));
    return note.id;
  } catch (err) {
    console.error('Quick note save failed', err);
    return null;
  }
}

async function handleMaximize(msg: Extract<OverlayToHost, { t: 'maximize' }>): Promise<void> {
  const noteId = await persistNote(msg.noteId, msg.title, msg.html);
  const w = window as any;
  try { sessionStorage.removeItem(QUICK_NOTE_SESSION_KEY); } catch { /* ignore */ }
  if (noteId) {
    try { sessionStorage.setItem(QUICK_NOTE_SESSION_KEY, noteId); } catch { /* ignore */ }
  }
  if (w.__novarynIndexActive) {
    window.dispatchEvent(new CustomEvent('novaryn-open-note'));
  } else if (noteId) {
    // The notebook page isn't mounted (user is on another route) — go there.
    window.location.href = '/app';
    return;
  }
  window.focus();
}

// ---------------- overlay (floating window) ----------------

let pipWindow: Window | null = null;

/**
 * Opens (or focuses) the floating quick note window.
 * Must be called from a user gesture inside the Novaryn interface.
 */
export async function openQuickNoteOverlay(
  opts: { noteId?: string | null; title?: string; html?: string } = {}
): Promise<OverlayOpenResult> {
  if (!isOverlaySupported()) {
    return { ok: false, reason: 'unsupported' };
  }
  if (pipWindow && !pipWindow.closed) {
    pipWindow.focus();
    return { ok: true, reused: true };
  }
  try {
    const win: Window = await (window as any).documentPictureInPicture.requestWindow({
      width: 420,
      height: 320,
    });
    pipWindow = win;
    win.addEventListener('close', () => {
      if (pipWindow === win) pipWindow = null;
    });
    buildOverlay(win, {
      noteId: opts.noteId ?? null,
      title: opts.title ?? '',
      html: opts.html ?? '',
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: 'error', message: err?.message || String(err) };
  }
}

const ICON_MAXIMIZE = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

const OVERLAY_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  display: flex; flex-direction: column;
  background: var(--background, #ffffff);
  color: var(--foreground, #1a1a1a);
  font-family: var(--app-font-family, Cambria, Georgia, serif);
  font-size: var(--app-font-size, 16px);
}
.qn-header {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; flex-shrink: 0;
  border-bottom: 1px solid var(--border, #e5e5e5);
  font-family: var(--app-font-family, Cambria, Georgia, serif);
}
.qn-dot { width: 10px; height: 10px; border-radius: 3px; background: var(--primary, #2E5C35); flex-shrink: 0; }
.qn-brand { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qn-status { font-size: 10px; color: var(--muted-foreground, #888); margin-left: auto; white-space: nowrap; }
.qn-btn {
  border: 0; background: transparent; color: var(--foreground, #1a1a1a);
  cursor: pointer; padding: 5px; border-radius: 6px; line-height: 0; flex-shrink: 0;
}
.qn-btn:hover { background: var(--accent, #f1f1f1); }
.qn-title-input {
  width: 100%; border: 0; outline: none; background: transparent;
  padding: 10px 12px 2px; font-size: 1em; font-weight: 600;
  color: inherit; font-family: inherit;
}
.qn-body {
  flex: 1; overflow-y: auto; outline: none;
  padding: 6px 12px 12px; font-size: 0.9em; line-height: 1.6;
}
.qn-body:focus { outline: none; }
.qn-body.is-empty:before {
  content: attr(data-placeholder);
  color: var(--muted-foreground, #999);
  pointer-events: none;
}
.qn-body img { max-width: 100%; }
.qn-body p { margin: 0 0 0.4em; }
`;

function buildOverlay(
  win: Window,
  initial: { noteId: string | null; title: string; html: string }
): void {
  const doc = win.document;
  doc.title = 'Novaryn Quick Note';

  // Inherit the app theme so colors/fonts match (dark & purple themes too).
  doc.documentElement.className = document.documentElement.className;
  const themeAttr = document.documentElement.getAttribute('data-theme');
  if (themeAttr) doc.documentElement.setAttribute('data-theme', themeAttr);
  const rootStyle = getComputedStyle(document.documentElement);
  for (const v of ['--app-font-family', '--app-font-size']) {
    const val = rootStyle.getPropertyValue(v).trim();
    if (val) doc.documentElement.style.setProperty(v, val);
  }

  // Adopt the main document's stylesheets (Tailwind tokens, CSS variables).
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('');
      const style = doc.createElement('style');
      style.textContent = css;
      doc.head.appendChild(style);
    } catch {
      // Cross-origin stylesheet — skip.
    }
  }
  const localStyle = doc.createElement('style');
  localStyle.textContent = OVERLAY_CSS;
  doc.head.appendChild(localStyle);

  // --- state ---
  let noteId = initial.noteId;
  let rid = 0;
  let dirty = false;
  let finalized = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const channel = new BroadcastChannel(CHANNEL);

  const pending = new Map<number, (noteId: string | null) => void>();
  channel.onmessage = (ev: MessageEvent) => {
    const msg = ev.data as HostToOverlay;
    if (!msg || msg.t !== 'saved') return;
    const resolve = pending.get(msg.rid);
    if (resolve) {
      pending.delete(msg.rid);
      resolve(msg.noteId);
    }
  };

  // --- DOM ---
  const header = doc.createElement('div');
  header.className = 'qn-header';

  const dot = doc.createElement('span');
  dot.className = 'qn-dot';
  const brand = doc.createElement('span');
  brand.className = 'qn-brand';
  brand.textContent = 'Novaryn — Quick Note';
  const status = doc.createElement('span');
  status.className = 'qn-status';
  status.textContent = 'Autosaves';

  const maximizeBtn = doc.createElement('button');
  maximizeBtn.className = 'qn-btn';
  maximizeBtn.title = 'Maximize: open this note in the app editor';
  maximizeBtn.innerHTML = ICON_MAXIMIZE;
  const closeBtn = doc.createElement('button');
  closeBtn.className = 'qn-btn';
  closeBtn.title = 'Close quick note';
  closeBtn.innerHTML = ICON_CLOSE;

  header.append(dot, brand, status, maximizeBtn, closeBtn);

  const titleInput = doc.createElement('input');
  titleInput.className = 'qn-title-input';
  titleInput.placeholder = 'Title (optional)';
  titleInput.value = initial.title === 'Quick Note' ? '' : initial.title;

  const body = doc.createElement('div');
  body.className = 'qn-body';
  body.contentEditable = 'true';
  body.setAttribute('data-placeholder', 'Jot something down… it floats above your other apps');
  body.innerHTML = DOMPurify.sanitize(initial.html || '', SANITIZE_OPTS);

  doc.body.append(header, titleInput, body);

  const syncPlaceholder = () => {
    const empty = !body.textContent?.trim() && !body.querySelector('img');
    body.classList.toggle('is-empty', empty);
  };
  syncPlaceholder();

  const currentTitle = () => titleInput.value.trim();

  const sendSave = (t: 'save' | 'maximize' | 'closed') => {
    const id = ++rid;
    const msg = { t, rid: id, noteId, title: currentTitle(), html: body.innerHTML };
    channel.postMessage(msg);
    dirty = false;
    return new Promise<string | null>((resolve) => {
      pending.set(id, (adopted) => {
        if (adopted && !noteId) noteId = adopted;
        resolve(adopted);
      });
      // Never block on a reply
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          resolve(null);
        }
      }, 4000);
    });
  };

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const scheduleSave = () => {
    dirty = true;
    setStatus('Saving…');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void sendSave('save').then(() => setStatus('Saved'));
    }, 2000);
  };

  body.addEventListener('input', () => {
    syncPlaceholder();
    scheduleSave();
  });
  titleInput.addEventListener('input', scheduleSave);

  // Paste as plain-ish content; the host sanitizes before storing.
  body.addEventListener('paste', (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text/plain');
    if (text != null) {
      e.preventDefault();
      doc.execCommand('insertText', false, text);
      syncPlaceholder();
      scheduleSave();
    }
  });

  maximizeBtn.addEventListener('click', () => {
    finalized = true;
    if (saveTimer) clearTimeout(saveTimer);
    void sendSave('maximize').then(() => win.close());
  });

  closeBtn.addEventListener('click', () => {
    finalized = true;
    if (saveTimer) clearTimeout(saveTimer);
    void sendSave('closed').then(() => win.close());
  });

  // Final save if the window is closed any other way (native X, opener closes).
  win.addEventListener('pagehide', () => {
    if (finalized) return;
    finalized = true;
    if (saveTimer) clearTimeout(saveTimer);
    if (dirty || body.innerHTML) {
      channel.postMessage({
        t: 'closed',
        rid: ++rid,
        noteId,
        title: currentTitle(),
        html: body.innerHTML,
      });
    }
  });

  setTimeout(() => body.focus(), 50);
}
