import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin, adminApi } from "@/lib/admin-client";
import {
  generateEscrowKeypair,
  importEscrowPrivate,
  unwrapUserKey,
  decryptWithUserKey,
  deriveUserKeyBytes,
  storeEscrowPrivatePinned,
  loadEscrowPrivatePinned,
  hasStoredEscrowPrivate,
  clearStoredEscrowPrivate,
  downloadEscrowPrivate,
  importEscrowPublic,
  wrapUserKey,
} from "@/lib/admin-escrow";
import { encryptPayload, generateSecretKey, normalizeSecretKey, deriveUserHash } from "@/lib/cloud-crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Shield, Users, Database, KeyRound, UserPlus, RotateCcw, Download, LogOut, AlertTriangle, Smartphone, Link2, Copy, Coffee as CoffeeIcon, Heart } from "lucide-react";
import { useSearchParams } from "react-router-dom";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function AuthForm({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const redirectUrl = `${window.location.origin}/admin`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast.success("Account created. If email confirmation is required, check your inbox.");
      }
      onAuthed();
    } catch (e: any) {
      toast.error(e?.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Admin access</CardTitle>
        <CardDescription>
          {mode === "signin" ? "Sign in to the Notoria admin panel." : "Create an admin account. Only pre-authorized or invited emails will get admin rights."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div><Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div><Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
          <button type="button" className="text-sm text-muted-foreground hover:underline w-full text-center"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotAdminView({ email, onSignOut, onAccepted }: { email: string; onSignOut: () => void; onAccepted: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    if (!token.trim()) return;
    setBusy(true);
    try {
      await adminApi.acceptInvite(token.trim());
      toast.success("You are now an admin.");
      onAccepted();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to accept invite");
    } finally { setBusy(false); }
  };
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Not an admin</CardTitle>
        <CardDescription>Signed in as {email}. This account does not have admin rights.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="token">Have an invite token?</Label>
          <Input id="token" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste invite token" />
        </div>
        <div className="flex gap-2">
          <Button onClick={accept} disabled={busy || !token.trim()}>Accept invite</Button>
          <Button variant="outline" onClick={onSignOut}><LogOut className="w-4 h-4 mr-1" />Sign out</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const r = await adminApi.stats(); setStats(r.stats); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load stats"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <p className="text-muted-foreground">Loading stats…</p>;
  if (!stats) return null;
  const cards = [
    { label: "Total backups", value: stats.totalBackups, icon: Database },
    { label: "Unique users", value: stats.uniqueUsers, icon: Users },
    { label: "Recoverable backups", value: stats.recoverableBackups, icon: Shield },
    { label: "Storage used", value: formatBytes(stats.approxBytes ?? 0), icon: Database },
    { label: "Admins", value: `${stats.adminCount} / 2`, icon: Shield },
    { label: "Pending invites", value: stats.pendingInvites, icon: UserPlus },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase text-muted-foreground tracking-wide">{c.label}</span>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold mt-1">{c.value}</p>
            </CardContent>
          </Card>
        );
      })}
      <Button variant="outline" onClick={load} className="col-span-full justify-self-start">
        <RotateCcw className="w-4 h-4 mr-1" /> Refresh
      </Button>
    </div>
  );
}

function UsersTab({ onRecover }: { onRecover: (userHash: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const r = await adminApi.users(); setUsers(r.users); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load users"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <p className="text-muted-foreground">Loading users…</p>;
  if (users.length === 0) return <p className="text-muted-foreground">No backups yet.</p>;
  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={load}><RotateCcw className="w-3 h-3 mr-1" /> Refresh</Button>
      {users.map(u => (
        <Card key={u.userHash}>
          <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">User ID (anonymous hash)</p>
              <p className="font-mono text-xs break-all">{u.userHash}</p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{u.notes} notes</span>
                <span>{formatBytes(u.bytes ?? 0)}</span>
                <span>Last: {new Date(u.lastUpdate).toLocaleString()}</span>
                {u.recoverable
                  ? <Badge variant="secondary" className="text-[10px]">Recoverable</Badge>
                  : <Badge variant="outline" className="text-[10px]">No escrow</Badge>}
              </div>
            </div>
            <Button size="sm" disabled={!u.recoverable} onClick={() => onRecover(u.userHash)}>
              <KeyRound className="w-3 h-3 mr-1" /> Recover
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EscrowTab({ info, onChange }: { info: any; onChange: () => void }) {
  const isMaster = info?.admin?.role === "master";
  const [hasLocal, setHasLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => { hasStoredEscrowPrivate().then(setHasLocal); }, []);

  const setupEscrow = async () => {
    if (!isMaster) return;
    if (!/^\d{6,12}$/.test(pin)) { toast.error("Enter a 6–12 digit PIN to protect the local copy"); return; }
    setBusy(true);
    try {
      const { publicJwk, privateJwk } = await generateEscrowKeypair();
      await adminApi.setEscrow(publicJwk);
      await storeEscrowPrivatePinned(privateJwk, pin);
      downloadEscrowPrivate(privateJwk);
      setHasLocal(true);
      onChange();
      toast.success("Escrow key generated. Backup the downloaded file in a safe place.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to set up escrow");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Escrow only protects backups uploaded <strong>after</strong> it's configured. Existing backups in the cloud cannot be recovered retroactively.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Escrow status</CardTitle>
          <CardDescription>Server-side public key used to wrap each user's encryption key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {info?.escrow
            ? <p>Active since {new Date(info.escrow.created_at).toLocaleString()}.</p>
            : <p className="text-muted-foreground">No escrow key configured yet.</p>}
          <p>Local escrow private key: {hasLocal ? <Badge variant="secondary">Stored (PIN-locked)</Badge> : <Badge variant="outline">Not stored</Badge>}</p>
        </CardContent>
      </Card>

      {isMaster && !info?.escrow && (
        <Card>
          <CardHeader>
            <CardTitle>Generate escrow keypair</CardTitle>
            <CardDescription>The public key is uploaded; the private key is downloaded as a file and stored locally encrypted with your PIN.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="setupPin">Local PIN (6–12 digits)</Label>
            <Input id="setupPin" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} maxLength={12} />
            <Button onClick={setupEscrow} disabled={busy}>
              <KeyRound className="w-4 h-4 mr-1" /> Generate & publish
            </Button>
          </CardContent>
        </Card>
      )}

      {hasLocal && (
        <Button variant="ghost" size="sm" onClick={async () => { await clearStoredEscrowPrivate(); setHasLocal(false); toast.message("Local escrow key removed"); }}>
          Remove local key
        </Button>
      )}
    </div>
  );
}

function InvitesTab({ info, onChange }: { info: any; onChange: () => void }) {
  const isMaster = info?.admin?.role === "master";
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const r = await adminApi.createInvite(email);
      setToken(r.token);
      toast.success("Invite created — copy & send the token to the invitee.");
      onChange();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  if (!isMaster) return <p className="text-muted-foreground">Only the master admin can manage invites.</p>;
  if (info.adminCount >= 2) return <p className="text-muted-foreground">Admin limit reached (2 / 2).</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite second admin</CardTitle>
        <CardDescription>Generates a one-time token (valid 7 days). The invitee signs up with that email at <code>/admin</code> and pastes the token.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="inviteEmail">Email</Label>
        <Input id="inviteEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="second-admin@example.com" />
        <Button onClick={create} disabled={busy || !email}>
          <UserPlus className="w-4 h-4 mr-1" /> Create invite
        </Button>
        {token && (
          <Alert className="mt-3">
            <AlertDescription>
              <p className="font-medium">Invite token (share securely, shown once):</p>
              <code className="block break-all bg-muted p-2 rounded mt-1 text-xs">{token}</code>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(token); toast.success("Copied"); }}>Copy</Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function RecoverTab({ initialHash }: { initialHash: string }) {
  const [userHash, setUserHash] = useState(initialHash);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => { setUserHash(initialHash); }, [initialHash]);

  const run = async () => {
    setBusy(true); setReport(null); setNewSecret(null);
    try {
      if (!/^[0-9a-f]{64}$/.test(userHash.trim())) throw new Error("Invalid user hash");

      // 1. Load escrow private (from local PIN-locked store)
      const privJwk = await loadEscrowPrivatePinned(pin);
      const privKey = await importEscrowPrivate(privJwk);

      // 2. Fetch user's backup + wrapped key
      const r = await adminApi.recover(userHash.trim());
      if (!r.recoverable || !r.wrappedKey) throw new Error("This user has no escrow-wrapped backups (uploaded before escrow was active).");

      // 3. Unwrap user's enc key bytes
      const userKey = await unwrapUserKey(privKey, r.wrappedKey);

      // 4. Decrypt every note
      const decoded: any[] = [];
      for (const n of r.notes) {
        try { decoded.push({ id: n.note_id, data: await decryptWithUserKey(userKey, n.ciphertext, n.nonce) }); }
        catch { /* skip */ }
      }
      if (decoded.length === 0) throw new Error("Decryption failed for all notes.");

      // 5. Generate a NEW secret key for the user, re-encrypt + upload
      const fresh = generateSecretKey();
      const normalized = normalizeSecretKey(fresh)!;
      const payload = await Promise.all(decoded.map(async d => {
        const { ciphertext, nonce } = await encryptPayload(normalized, d.data);
        return { id: d.id, ciphertext, nonce, clientUpdatedAt: new Date().toISOString() };
      }));

      // 6. Also wrap the new user key with current escrow public so future recovery works.
      const escrowPubResp = await (await import("@/integrations/supabase/client")).supabase
        .from("admin_escrow").select("public_key_jwk").maybeSingle();
      let escrowWrappedKey: string | undefined;
      const pubJwk = (escrowPubResp.data as any)?.public_key_jwk;
      if (pubJwk) {
        const pub = await importEscrowPublic(pubJwk);
        const ub = await deriveUserKeyBytes(normalized);
        escrowWrappedKey = await wrapUserKey(pub, ub);
      }

      // 7. Upload under the NEW user hash
      const { supabase } = await import("@/integrations/supabase/client");
      const newHash = await deriveUserHash(normalized);
      const { error } = await supabase.functions.invoke("cloud-backup", {
        body: { secretKey: normalized, notes: payload, escrowWrappedKey },
      });
      if (error) throw new Error(error.message);

      setNewSecret(normalized);
      setReport(`Recovered ${payload.length} notes. The user must use the NEW secret key below. New user ID: ${newHash}`);
      toast.success("Recovery complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Recovery failed");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restore lost-key data</CardTitle>
        <CardDescription>
          Decrypts a user's escrow-wrapped backups locally using the escrow private key,
          then re-encrypts them under a fresh secret key that you deliver to the user out-of-band.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="rhash">User ID (anonymous hash)</Label>
          <Input id="rhash" value={userHash} onChange={e => setUserHash(e.target.value)} placeholder="64-char hex" className="font-mono text-xs" />
        </div>
        <div>
          <Label htmlFor="rpin">Escrow PIN</Label>
          <Input id="rpin" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} />
        </div>
        <Button onClick={run} disabled={busy || !userHash || !pin}>
          <KeyRound className="w-4 h-4 mr-1" /> Recover & re-key
        </Button>

        {report && <Alert><AlertDescription>{report}</AlertDescription></Alert>}
        {newSecret && (
          <Alert>
            <AlertDescription>
              <p className="font-medium mb-1">New secret key (deliver securely to the user):</p>
              <code className="block break-all bg-muted p-2 rounded text-xs">{newSecret}</code>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(newSecret); toast.success("Copied"); }}>Copy</Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function UnauthorizedDeviceView({ info, onRedeemed, onSignOut }: { info: any; onRedeemed: () => void; onSignOut: () => void }) {
  const [search] = useSearchParams();
  const [token, setToken] = useState(search.get("device_token") ?? "");
  const [busy, setBusy] = useState(false);

  const redeem = async () => {
    if (!token.trim()) return;
    setBusy(true);
    try {
      await adminApi.redeemDeviceLink(token.trim());
      toast.success("Device authorized. The previous device has been signed out of admin.");
      onRedeemed();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to redeem link");
    } finally { setBusy(false); }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Authorize this device</CardTitle>
        <CardDescription>
          Signed in as <strong>{info.user.email}</strong>. For security, each admin can only be active on one device at a time.
          Generate a one-time link from your currently authorized device and paste it here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {info.device?.current && (
          <Alert>
            <AlertDescription className="text-xs">
              <p className="font-medium mb-1">Currently authorized device:</p>
              <p className="text-muted-foreground break-words">{info.device.current.user_agent || "unknown agent"}</p>
              <p className="text-muted-foreground">IP {info.device.current.ip ?? "unknown"} • last seen {new Date(info.device.current.last_seen_at).toLocaleString()}</p>
            </AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="dtoken">One-time device link / token</Label>
          <Input id="dtoken" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token from authorized device" className="font-mono text-xs" />
        </div>
        <div className="flex gap-2">
          <Button onClick={redeem} disabled={busy || !token.trim()}>
            <Link2 className="w-4 h-4 mr-1" /> Authorize this device
          </Button>
          <Button variant="outline" onClick={onSignOut}><LogOut className="w-4 h-4 mr-1" /> Sign out</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DevicesTab({ info, onChange }: { info: any; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ token: string; url: string } | null>(null);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await adminApi.createDeviceLink();
      const url = `${window.location.origin}/admin?device_token=${r.token}`;
      setLink({ token: r.token, url });
      toast.success(`Link created — valid for ${r.expiresInMinutes} minutes.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create link");
    } finally { setBusy(false); }
  };

  const cur = info.device?.current;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> This device</CardTitle>
          <CardDescription>Admin access is bound to one device at a time. The other admin's device is independent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Device ID:</span> <code className="text-xs break-all">{cur?.device_id ?? "—"}</code></p>
          <p><span className="text-muted-foreground">IP:</span> {cur?.ip ?? "unknown"}</p>
          <p><span className="text-muted-foreground">Browser:</span> <span className="break-words">{cur?.user_agent ?? "unknown"}</span></p>
          <p><span className="text-muted-foreground">Bound since:</span> {cur ? new Date(cur.claimed_at).toLocaleString() : "—"}</p>
          <p><span className="text-muted-foreground">Last activity:</span> {cur ? new Date(cur.last_seen_at).toLocaleString() : "—"}</p>
          <Button variant="ghost" size="sm" onClick={onChange} className="mt-2"><RotateCcw className="w-3 h-3 mr-1" /> Refresh</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="w-5 h-5" /> Move admin to a new device</CardTitle>
          <CardDescription>
            Generates a one-time link (valid 15 minutes). Sign in with the same admin email on the new device, paste this token, and your admin
            binding moves there. This device will immediately lose admin access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={generate} disabled={busy}>
            <Link2 className="w-4 h-4 mr-1" /> Generate device link
          </Button>
          {link && (
            <Alert>
              <AlertDescription className="space-y-2">
                <div>
                  <p className="font-medium text-xs mb-1">Token (paste on new device):</p>
                  <code className="block break-all bg-muted p-2 rounded text-xs">{link.token}</code>
                </div>
                <div>
                  <p className="font-medium text-xs mb-1">Or share this URL:</p>
                  <code className="block break-all bg-muted p-2 rounded text-xs">{link.url}</code>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link.token); toast.success("Token copied"); }}>
                    <Copy className="w-3 h-3 mr-1" /> Copy token
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link.url); toast.success("URL copied"); }}>
                    <Copy className="w-3 h-3 mr-1" /> Copy URL
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function CoffeeTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.coffeeStats();
      setStats(r.stats);
      setRecent(r.recent);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load coffee stats");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Loading coffee stats…</p>;
  if (!stats) return null;

  const currencies = Object.entries(stats.byCurrency ?? {}) as Array<[string, { count: number; amount: number }]>;
  const cards = [
    { label: "Total supports", value: stats.totalSupports, icon: Heart },
    { label: "Unique supporters", value: stats.uniqueSupporters, icon: Users },
    { label: "Last 30 days", value: stats.last30DaysCount, icon: CoffeeIcon },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-muted-foreground tracking-wide">{c.label}</span>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-1">{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals raised</CardTitle>
            <CardDescription>Successful checkouts grouped by currency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {currencies.map(([cur, v]) => (
              <div key={cur} className="flex items-center justify-between border-b last:border-0 py-1">
                <span className="font-medium">{formatMoney(v.amount, cur)}</span>
                <span className="text-muted-foreground text-xs">{v.count} support{v.count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent supports</CardTitle>
          <CardDescription>Last 50 verified checkouts.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No supports recorded yet. Stats are captured when a buyer is redirected back to the Coffee page after a successful purchase.</p>
          ) : (
            <div className="space-y-2">
              {recent.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-3 border-b last:border-0 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.product_name ?? "Coffee"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.customer_email ?? "anonymous"} • {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold">
                      {r.amount != null && r.currency ? formatMoney(r.amount, r.currency) : "—"}
                    </p>
                    <Badge variant={r.status === "succeeded" ? "secondary" : "outline"} className="text-[10px]">{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={load} className="mt-3">
            <RotateCcw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { loading, session, info, error, refresh } = useAdmin();
  const [activeTab, setActiveTab] = useState("stats");
  const [recoverHash, setRecoverHash] = useState("");

  const signOut = async () => { await supabase.auth.signOut(); refresh(); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Admin panel</h1>
            {info?.admin && <Badge variant={info.admin.role === "master" ? "default" : "secondary"}>{info.admin.role}</Badge>}
            {session && <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <p className="text-muted-foreground">Loading…</p>}

        {!loading && !session && <AuthForm onAuthed={refresh} />}

        {!loading && session && info && !info.admin && (
          <NotAdminView email={info.user.email} onSignOut={signOut} onAccepted={refresh} />
        )}

        {!loading && session && error && !info && (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        )}

        {!loading && info?.admin && info.device && !info.device.authorized && (
          <UnauthorizedDeviceView info={info} onRedeemed={refresh} onSignOut={signOut} />
        )}

        {!loading && info?.admin && info.device?.authorized && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="recover">Recover</TabsTrigger>
              <TabsTrigger value="escrow">Escrow</TabsTrigger>
              <TabsTrigger value="invites">Invites</TabsTrigger>
              <TabsTrigger value="devices">Device</TabsTrigger>
            </TabsList>
            <Separator className="my-4" />
            <TabsContent value="stats"><StatsTab /></TabsContent>
            <TabsContent value="users"><UsersTab onRecover={(h) => { setRecoverHash(h); setActiveTab("recover"); }} /></TabsContent>
            <TabsContent value="recover"><RecoverTab initialHash={recoverHash} /></TabsContent>
            <TabsContent value="escrow"><EscrowTab info={info} onChange={refresh} /></TabsContent>
            <TabsContent value="invites"><InvitesTab info={info} onChange={refresh} /></TabsContent>
            <TabsContent value="devices"><DevicesTab info={info} onChange={refresh} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
