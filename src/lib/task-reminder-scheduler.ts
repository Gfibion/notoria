// App-wide task alert scheduler. Runs on every page (not only Tasks), works offline,
// and shows OS-level notifications through the service worker when available.
import { getAllTasks, Task } from '@/lib/tasks-db';

export const REMINDERS_ENABLED_KEY = 'notoria-reminders-enabled';
const VOLUME_KEY = 'notoria-notification-volume';
const FIRED_KEY = 'notoria-fired-alerts';
const CHECK_MS = 20_000;
const LATE_GRACE_MS = 15 * 60_000; // still fire if the app was closed briefly at alert time
const DUE_SOON_MS = 30 * 60_000;

export const remindersEnabled = () => localStorage.getItem(REMINDERS_ENABLED_KEY) !== 'false';

const getFired = (): Record<string, number> => {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, t]) => now - (t as number) < 3 * 86400_000)) as Record<string, number>;
  } catch { return {}; }
};
const markFired = (key: string) => {
  const f = getFired(); f[key] = Date.now();
  localStorage.setItem(FIRED_KEY, JSON.stringify(f));
};

export const playAlertSound = () => {
  try {
    const a = new Audio('/sounds/notification.wav');
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.7');
    a.volume = isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
    a.play().catch(() => {});
  } catch {}
};

export async function showSystemNotification(title: string, options: NotificationOptions = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const opts: NotificationOptions = { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', ...options };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.getRegistration(),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500)),
      ]);
      if (reg) { await reg.showNotification(title, opts); return true; }
    }
  } catch {}
  try {
    const n = new Notification(title, opts);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch { return false; }
}

const parseLocal = (date: string, time?: string): Date | null => {
  const d = date.split('T')[0];
  const t = time || (date.includes('T') ? date.split('T')[1].slice(0, 5) : '09:00');
  const dt = new Date(`${d}T${t.length === 5 ? t + ':00' : t}`);
  return isNaN(dt.getTime()) ? null : dt;
};

async function check() {
  if (!remindersEnabled() || !('Notification' in window) || Notification.permission !== 'granted') return;
  let tasks: Task[] = [];
  try { tasks = await getAllTasks(); } catch { return; }
  const now = Date.now();
  const fired = getFired();
  for (const task of tasks) {
    if (!task.dueDate || task.status === 'done') continue;
    const alerts: { key: string; at: number; title: string; body: string }[] = [];
    if (task.reminder) {
      const at = parseLocal(task.dueDate, task.reminder);
      if (at) alerts.push({ key: `${task.id}:r:${at.getTime()}`, at: at.getTime(), title: `Reminder: ${task.title}`, body: task.description || 'Your alert time has been reached.' });
    }
    const due = parseLocal(task.dueDate);
    if (due) {
      alerts.push({ key: `${task.id}:s:${due.getTime()}`, at: due.getTime() - DUE_SOON_MS, title: `Due soon: ${task.title}`, body: `Due at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` });
      alerts.push({ key: `${task.id}:d:${due.getTime()}`, at: due.getTime(), title: `Due now: ${task.title}`, body: task.description || 'This task is due now.' });
    }
    for (const a of alerts) {
      if (fired[a.key] || now < a.at || now - a.at > LATE_GRACE_MS) continue;
      markFired(a.key); fired[a.key] = now;
      await showSystemNotification(a.title, { body: a.body, tag: a.key, requireInteraction: true, data: { url: '/tasks' } } as NotificationOptions);
      playAlertSound();
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startTaskReminderScheduler() {
  if (timer) return;
  check();
  timer = setInterval(check, CHECK_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('tasks-changed', () => check());
}
