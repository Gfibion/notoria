import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Cloud, CloudOff, Copy, Check, Eye, EyeOff, Fingerprint,
  KeyRound, Lock, Upload, Download, Trash2, ShieldCheck, RefreshCw, AlertTriangle, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  generateSecretKey, normalizeSecretKey,
  wrapSecretWithPin, unwrapSecretWithPin,
  wrapSecretWithBiometric, unwrapSecretWithBiometric,
  isWebAuthnSupported,
} from "@/lib/cloud-crypto";
import { loadWrappedSecret, saveWrappedSecret, clearWrappedSecret } from "@/lib/cloud-keystore";
import { backupNotes, listCloudNotes, restoreNotes, deleteCloudNotes, type CloudNoteMeta } from "@/lib/cloud-sync";
import { getAllNotes, saveNote, type Note } from "@/lib/db";

type UnlockMode = "none" | "pin" | "biometric";

export default function CloudBackupPage() {
  const navigate = useNavigate();

  // Unlocked secret kept only in component memory (never written to plain storage).
  const [secret, setSecret] = useState<string | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [storedMethod, setStoredMethod] = useState<UnlockMode>("none");

  // Local notes & cloud state
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [cloudMeta, setCloudMeta] = useState<CloudNoteMeta[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<Set<string>>(new Set());
  const [selectedCloud, setSelectedCloud] = useState<Set<string>>(new Set());

  // UI dialog state
  const [showSecret, setShowSecret] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [manualKeyOpen, setManualKeyOpen] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState<{ key: string } | null>(null);

  // Form state
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Initial load: detect stored wrapped key + load local notes
  useEffect(() => {
    (async () => {
      const w = await loadWrappedSecret();
      if (w) {
        setHasStoredKey(true);
        setStoredMethod(w.method === "webauthn" ? "biometric" : "pin");
      }
      const all = await getAllNotes();
      setLocalNotes(all);
    })();
  }, []);

  // When unlocked, fetch cloud metadata
  useEffect(() => {
    if (!secret) {
      setCloudMeta([]);
      return;
    }
    (async () => {
      try {
        const meta = await listCloudNotes(secret);
        setCloudMeta(meta);
      } catch (e: any) {
        toast({ title: "Could not load cloud notes", description: e.message, variant: "destructive" });
      }
    })();
  }, [secret]);

  const cloudIds = useMemo(() => new Set(cloudMeta.map(m => m.note_id)), [cloudMeta]);
  const localById = useMemo(() => new Map(localNotes.map(n => [n.id, n])), [localNotes]);

  const toggleSet = (s: Set<string>, id: string) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  // ─── Key creation ────────────────────────────────────────────────
  const beginCreateKey = () => {
    const key = generateSecretKey();
    setNewKeyDialog({ key });
  };

  const finalizeNewKey = async (key: string, method: "pin" | "biometric", pin?: string) => {
    setBusy(true);
    try {
      const wrapped = method === "pin"
        ? await wrapSecretWithPin(key, pin!)
        : await wrapSecretWithBiometric(key);
      await saveWrappedSecret(wrapped);
      setSecret(key);
      setHasStoredKey(true);
      setStoredMethod(method);
      setNewKeyDialog(null);
      setSetupOpen(false);
      setPinInput(""); setPinConfirm("");
      toast({ title: "Secret key activated", description: "Your key is locked on this device." });
    } catch (e: any) {
      toast({ title: "Could not save key", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ─── Unlock existing wrapped key ─────────────────────────────────
  const tryUnlock = async () => {
    setBusy(true);
    try {
      const w = await loadWrappedSecret();
      if (!w) throw new Error("No stored key found");
      const s = w.method === "webauthn"
        ? await unwrapSecretWithBiometric(w)
        : await unwrapSecretWithPin(w, pinInput);
      setSecret(s);
      setUnlockOpen(false);
      setPinInput("");
      toast({ title: "Unlocked" });
    } catch (e: any) {
      toast({ title: "Unlock failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ─── Manual key entry (paste from external store) ────────────────
  const submitManualKey = async () => {
    const norm = normalizeSecretKey(manualKeyInput);
    if (!norm) {
      const stripped = manualKeyInput.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const core = stripped.startsWith("NT") ? stripped.slice(2) : stripped;
      toast({
        title: "Invalid key format",
        description: `Expected 32 letters/digits after the NT prefix; got ${core.length}. Re-copy the full key (it looks like NT-XXXX-XXXX-…-XXXX).`,
        variant: "destructive",
      });
      return;
    }
    setSecret(norm);
    setManualKeyInput("");
    setManualKeyOpen(false);
    toast({ title: "Key accepted", description: "Loaded into memory for this session." });
  };

  // ─── Backup / Restore / Sync actions ───────────────────────────
  const doBackup = async () => {
    if (!secret) return;
    const notes = localNotes.filter(n => selectedLocal.has(n.id));
    if (notes.length === 0) {
      toast({ title: "Select notes to back up", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const count = await backupNotes(secret, notes);
      toast({ title: "Backup complete", description: `${count} note${count === 1 ? "" : "s"} encrypted & uploaded.` });
      const meta = await listCloudNotes(secret);
      setCloudMeta(meta);
      setSelectedLocal(new Set());
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const doSyncNow = async () => {
    if (!secret) return;
    const notes = localNotes.filter(n => selectedLocal.has(n.id));
    if (notes.length === 0) {
      toast({ title: "Select notes to sync", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const count = await backupNotes(secret, notes);
      const all = await getAllNotes();
      setLocalNotes(all);
      const meta = await listCloudNotes(secret);
      setCloudMeta(meta);
      setSelectedLocal(new Set());
      toast({ title: "Sync complete", description: `${count} note${count === 1 ? "" : "s"} uploaded and state refreshed.` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    if (!secret) return;
    const ids = Array.from(selectedCloud);
    if (ids.length === 0) {
      toast({ title: "Select cloud notes to restore", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const restored = await restoreNotes(secret, ids);
      let skipped = 0, written = 0;
      for (const cloudNote of restored) {
        const existing = localById.get(cloudNote.id);
        // Chronological consistency: skip if local is newer.
        if (existing && new Date(existing.updatedAt).getTime() >= new Date(cloudNote.updatedAt).getTime()) {
          skipped++;
          continue;
        }
        await saveNote(cloudNote);
        written++;
      }
      const all = await getAllNotes();
      setLocalNotes(all);
      setSelectedCloud(new Set());
      toast({
        title: "Restore complete",
        description: `${written} restored${skipped ? `, ${skipped} skipped (local is newer)` : ""}.`,
      });
    } catch (e: any) {
      toast({ title: "Restore failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const doDeleteCloud = async () => {
    if (!secret) return;
    const ids = Array.from(selectedCloud);
    if (ids.length === 0) return;
    if (!confirm(`Permanently remove ${ids.length} note${ids.length === 1 ? "" : "s"} from cloud? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteCloudNotes(secret, { noteIds: ids });
      const meta = await listCloudNotes(secret);
      setCloudMeta(meta);
      setSelectedCloud(new Set());
      toast({ title: "Cloud entries removed" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const forgetKeyFromDevice = async () => {
    if (!confirm("Remove the stored key from this device? You'll need to paste it back in (or set up again) to restore notes.")) return;
    await clearWrappedSecret();
    setSecret(null);
    setHasStoredKey(false);
    setStoredMethod("none");
    toast({ title: "Key removed from this device" });
  };

  const copyKey = useCallback(async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast({ title: "Copied to clipboard", description: "Store it somewhere safe." });
    } catch {
      toast({ title: "Copy failed", description: "Long-press the key to copy manually.", variant: "destructive" });
    }
  }, []);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Cloud Backup</h1>
          </div>
          {secret && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Unlocked
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>End-to-end encrypted</AlertTitle>
          <AlertDescription className="text-sm">
            Your notes are encrypted on this device before upload. Only your secret key can read them — we can't.
            Lose the key and the data is unrecoverable.
          </AlertDescription>
        </Alert>

        {/* Key status card */}
        <section className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <h2 className="font-medium">Your secret key</h2>
            </div>
            {secret && (
              <Button variant="ghost" size="sm" onClick={() => setShowSecret(s => !s)}>
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {!secret && !hasStoredKey && (
            <>
              <p className="text-sm text-muted-foreground">
                You don't have a key on this device yet. Create a new one, or paste an existing key to access notes
                you've already backed up.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={beginCreateKey} disabled={busy}>
                  <Plus className="w-4 h-4 mr-1" /> Create new key
                </Button>
                <Button variant="outline" onClick={() => setManualKeyOpen(true)}>
                  Paste existing key
                </Button>
              </div>
            </>
          )}

          {!secret && hasStoredKey && (
            <>
              <p className="text-sm text-muted-foreground">
                A key is stored on this device, locked with your {storedMethod === "biometric" ? "biometric (fingerprint/Face)" : "PIN"}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setUnlockOpen(true)} disabled={busy}>
                  {storedMethod === "biometric" ? <Fingerprint className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                  Unlock
                </Button>
                <Button variant="outline" onClick={() => setManualKeyOpen(true)}>Paste different key</Button>
                <Button variant="ghost" onClick={forgetKeyFromDevice} className="text-destructive hover:text-destructive">
                  Forget key
                </Button>
              </div>
            </>
          )}

          {secret && (
            <>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50 font-mono text-xs break-all">
                <span className="flex-1">{showSecret ? secret : secret.replace(/[A-Z0-9]/g, "•")}</span>
                <Button variant="ghost" size="icon" onClick={() => copyKey(secret)} aria-label="Copy key">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Save this somewhere safe (password manager, encrypted note, printed copy). It's the only way to restore
                your notes on another device.
              </p>
              <div className="flex flex-wrap gap-2">
                {!hasStoredKey && (
                  <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
                    Lock on this device
                  </Button>
                )}
                {hasStoredKey && (
                  <Button variant="ghost" size="sm" onClick={forgetKeyFromDevice} className="text-destructive hover:text-destructive">
                    Forget on this device
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSecret(null)}>Lock now</Button>
              </div>
            </>
          )}
        </section>

        {/* Backup / Restore */}
        {secret ? (
          <>
            {/* Local → cloud */}
            <section className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  <h2 className="font-medium">Back up to cloud</h2>
                  <span className="text-xs text-muted-foreground">({selectedLocal.size}/{localNotes.length})</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLocal(new Set(localNotes.map(n => n.id)))}>All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLocal(new Set())}>None</Button>
                </div>
              </div>

              <ScrollArea className="h-64 rounded border border-border">
                <ul className="divide-y divide-border">
                  {localNotes.length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground text-center">No local notes.</li>
                  )}
                  {localNotes.map(n => {
                    const inCloud = cloudIds.has(n.id);
                    const cloudEntry = cloudMeta.find(m => m.note_id === n.id);
                    const cloudTime = cloudEntry ? new Date(cloudEntry.client_updated_at).getTime() : 0;
                    const localTime = new Date(n.updatedAt).getTime();
                    const newer = inCloud && localTime > cloudTime;
                    return (
                      <li key={n.id} className="flex items-start gap-3 p-3 hover:bg-muted/40">
                        <Checkbox
                          checked={selectedLocal.has(n.id)}
                          onCheckedChange={() => setSelectedLocal(s => toggleSet(s, n.id))}
                          className="mt-1"
                          id={`local-${n.id}`}
                        />
                        <label htmlFor={`local-${n.id}`} className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{n.title || "Untitled"}</span>
                            {inCloud && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                                newer ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-green-500/15 text-green-700 dark:text-green-400")}>
                                {newer ? "Local newer" : "In cloud"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Updated {new Date(n.updatedAt).toLocaleString()}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              <div className="flex gap-2">
                <Button onClick={doSyncNow} disabled={busy || selectedLocal.size === 0} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sync now
                </Button>
                <Button variant="outline" onClick={doBackup} disabled={busy || selectedLocal.size === 0}>
                  <Upload className="w-4 h-4 mr-1" />
                  Back up
                </Button>
              </div>
            </section>

            {/* Cloud → local */}
            <section className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  <h2 className="font-medium">Restore from cloud</h2>
                  <span className="text-xs text-muted-foreground">({selectedCloud.size}/{cloudMeta.length})</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCloud(new Set(cloudMeta.map(m => m.note_id)))}>All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCloud(new Set())}>None</Button>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    if (!secret) return;
                    try { setCloudMeta(await listCloudNotes(secret)); } catch {}
                  }} aria-label="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-64 rounded border border-border">
                <ul className="divide-y divide-border">
                  {cloudMeta.length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground text-center">No cloud backups yet.</li>
                  )}
                  {cloudMeta.map(m => {
                    const local = localById.get(m.note_id);
                    const cloudTime = new Date(m.client_updated_at).getTime();
                    const localTime = local ? new Date(local.updatedAt).getTime() : 0;
                    const cloudNewer = !local || cloudTime > localTime;
                    return (
                      <li key={m.note_id} className="flex items-start gap-3 p-3 hover:bg-muted/40">
                        <Checkbox
                          checked={selectedCloud.has(m.note_id)}
                          onCheckedChange={() => setSelectedCloud(s => toggleSet(s, m.note_id))}
                          className="mt-1"
                          id={`cloud-${m.note_id}`}
                        />
                        <label htmlFor={`cloud-${m.note_id}`} className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{local?.title || `Note ${m.note_id.slice(0, 8)}…`}</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                              !local ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                : cloudNewer ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground")}>
                              {!local ? "Not on device" : cloudNewer ? "Cloud newer" : "Up to date"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Cloud version {new Date(m.client_updated_at).toLocaleString()}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              <div className="flex gap-2">
                <Button onClick={doRestore} disabled={busy || selectedCloud.size === 0} className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Restore {selectedCloud.size || ""} selected
                </Button>
                <Button variant="outline" onClick={doDeleteCloud} disabled={busy || selectedCloud.size === 0}
                        className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Restore won't overwrite a note that's newer on this device (chronological consistency).
              </p>
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
            <CloudOff className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Unlock or paste your key to see cloud backups.</p>
          </section>
        )}
      </main>

      {/* ─── Dialog: setup PIN/biometric for a freshly-created key ───────────── */}
      <Dialog open={!!newKeyDialog} onOpenChange={(o) => !o && setNewKeyDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Save your new key</DialogTitle>
            <DialogDescription>
              This key is the <strong>only way</strong> to restore your notes. Copy it now and store it somewhere safe.
            </DialogDescription>
          </DialogHeader>

          {newKeyDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-muted font-mono text-sm break-all select-all">
                {newKeyDialog.key}
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyKey(newKeyDialog.key)}>
                <Copy className="w-4 h-4 mr-1" /> Copy to clipboard
              </Button>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Lock it on this device for quick access:</p>
                <div className="space-y-2">
                  <Label htmlFor="new-pin">PIN (4–8 digits)</Label>
                  <Input id="new-pin" type="password" inputMode="numeric" maxLength={8} value={pinInput}
                         onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                  <Input type="password" inputMode="numeric" maxLength={8} value={pinConfirm}
                         onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <Button variant="ghost" onClick={() => { if (newKeyDialog) { setSecret(newKeyDialog.key); setNewKeyDialog(null); }}}>
              Skip — just use this session
            </Button>
            {isWebAuthnSupported() && newKeyDialog && (
              <Button variant="outline" disabled={busy}
                      onClick={() => finalizeNewKey(newKeyDialog.key, "biometric")}>
                <Fingerprint className="w-4 h-4 mr-1" /> Use biometric
              </Button>
            )}
            <Button disabled={busy || pinInput.length < 4 || pinInput !== pinConfirm}
                    onClick={() => newKeyDialog && finalizeNewKey(newKeyDialog.key, "pin", pinInput)}>
              <Lock className="w-4 h-4 mr-1" /> Save with PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: unlock existing wrapped key ────────────────────────────── */}
      <Dialog open={unlockOpen} onOpenChange={(o) => { setUnlockOpen(o); if (!o) setPinInput(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unlock your key</DialogTitle>
            <DialogDescription>
              {storedMethod === "biometric"
                ? "Confirm with biometric (fingerprint/Face/Windows Hello)."
                : "Enter the PIN you set when locking this key."}
            </DialogDescription>
          </DialogHeader>
          {storedMethod === "pin" && (
            <Input type="password" inputMode="numeric" maxLength={8} value={pinInput}
                   onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
                   placeholder="PIN" autoFocus
                   onKeyDown={(e) => e.key === "Enter" && tryUnlock()} />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnlockOpen(false)}>Cancel</Button>
            <Button onClick={tryUnlock} disabled={busy || (storedMethod === "pin" && pinInput.length < 4)}>
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: paste existing key ─────────────────────────────────────── */}
      <Dialog open={manualKeyOpen} onOpenChange={setManualKeyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Paste your secret key</DialogTitle>
            <DialogDescription>Format: NT-XXXX-XXXX-… (dashes and case are flexible).</DialogDescription>
          </DialogHeader>
          <Input value={manualKeyInput} onChange={e => setManualKeyInput(e.target.value)}
                 placeholder="NT-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autoFocus
                 onKeyDown={(e) => e.key === "Enter" && submitManualKey()} className="font-mono text-sm" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManualKeyOpen(false)}>Cancel</Button>
            <Button onClick={submitManualKey}>Use key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: lock current (already-loaded) key on this device ───────── */}
      <Dialog open={setupOpen} onOpenChange={(o) => { setSetupOpen(o); if (!o) { setPinInput(""); setPinConfirm(""); }}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lock key on this device</DialogTitle>
            <DialogDescription>Pick a PIN, or use biometrics if your device supports it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lock-pin">PIN (4–8 digits)</Label>
            <Input id="lock-pin" type="password" inputMode="numeric" maxLength={8} value={pinInput}
                   onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
            <Input type="password" inputMode="numeric" maxLength={8} value={pinConfirm}
                   onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            {isWebAuthnSupported() && secret && (
              <Button variant="outline" disabled={busy}
                      onClick={() => finalizeNewKey(secret, "biometric")}>
                <Fingerprint className="w-4 h-4 mr-1" /> Use biometric
              </Button>
            )}
            <Button disabled={busy || pinInput.length < 4 || pinInput !== pinConfirm}
                    onClick={() => secret && finalizeNewKey(secret, "pin", pinInput)}>
              <Lock className="w-4 h-4 mr-1" /> Save with PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
