import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Crown, Fingerprint, Laptop, Loader2, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { loadWrappedSecret } from "@/lib/cloud-keystore";
import { unwrapSecretWithPin, unwrapSecretWithBiometric, deriveUserHash } from "@/lib/cloud-crypto";
import { classicApi, type ClassicStatus } from "@/lib/classic-client";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" }) : "");

export default function ClassicPage() {
  const [status, setStatus] = useState<ClassicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [storedMethod, setStoredMethod] = useState<"pin" | "webauthn" | null>(null);
  const [pin, setPin] = useState("");
  const [userHash, setUserHash] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async (hash?: string | null) => {
    try {
      setStatus(await classicApi.status(hash ?? undefined));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load your plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    loadWrappedSecret().then((w) => w && setStoredMethod(w.method === "webauthn" ? "webauthn" : "pin"));
  }, [refresh]);

  const unlock = async () => {
    setBusy("unlock");
    try {
      const w = await loadWrappedSecret();
      if (!w) throw new Error("No Cloud ID is saved on this device");
      const secret = w.method === "webauthn" ? await unwrapSecretWithBiometric(w) : await unwrapSecretWithPin(w, pin);
      const h = await deriveUserHash(secret);
      setUserHash(h);
      setPin("");
      await refresh(h);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not unlock your Cloud ID");
    } finally {
      setBusy(null);
    }
  };

  const buy = async () => {
    if (!userHash) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Please enter a valid email");
    setBusy("buy");
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          plan: "classic",
          email: email.trim(),
          user_hash: userHash,
          callback_url: `${window.location.origin}/payment-confirmed`,
          channels: ["card", "mobile_money", "bank_transfer"],
        },
      });
      if (error) {
        let msg = "Could not start payment";
        const ctx = (error as { context?: Response }).context;
        const parsed = ctx ? await ctx.json().catch(() => null) : null;
        if (parsed?.error) msg = String(parsed.error);
        throw new Error(msg);
      }
      if (!data?.url) throw new Error("No payment link returned");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
      setBusy(null);
    }
  };

  const bind = async () => {
    if (!userHash) return;
    setBusy("bind");
    try {
      await classicApi.bind(userHash);
      toast.success("This device is now on Classic");
      await refresh(userHash);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not bind this device");
    } finally {
      setBusy(null);
    }
  };

  const unbind = async (id: string) => {
    if (!userHash) return;
    setBusy(`unbind-${id}`);
    try {
      await classicApi.unbind(userHash, id);
      toast.success("Device removed");
      await refresh(userHash);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove device");
    } finally {
      setBusy(null);
    }
  };

  const info = status?.info;
  const key = status?.key;
  const keyActive = key?.plan === "classic";

  return (
    <>
      <SEO path="/classic" title="Novaryn Classic" description="Novaryn Classic — more AI messages and images every day, on up to 3 of your devices." />
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
            </Button>
            <h1 className="font-display text-lg font-semibold">Novaryn Classic</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {loading || !info ? (
            <Card className="p-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> Loading…
            </Card>
          ) : (
            <>
              <Card className="p-6 md:p-8 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xl font-display font-semibold">Classic</p>
                      <p className="text-sm text-muted-foreground">
                        {info.currency} {info.price.toLocaleString()} / month
                      </p>
                    </div>
                  </div>
                  <Badge variant={status.device.plan === "classic" ? "default" : "secondary"}>
                    This device: {status.device.plan === "classic" ? "Classic" : "Regular"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="font-medium mb-1">Regular</p>
                    <p className="text-muted-foreground">{info.regularLimits.messages} AI messages/day</p>
                    <p className="text-muted-foreground">{info.regularLimits.images} images/day</p>
                  </div>
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <p className="font-medium mb-1">Classic</p>
                    <p>{info.classicLimits.messages} AI messages/day</p>
                    <p>{info.classicLimits.images} images/day</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {[
                    `Bound to your Cloud ID key — use it on up to ${info.maxDevices} devices`,
                    `Each payment adds ${info.days} days`,
                    "More Classic features coming",
                  ].map((t) => (
                    <li key={t} className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />{t}</li>
                  ))}
                </ul>
                {status.device.plan === "classic" && (
                  <p className="text-sm text-muted-foreground">Classic on this device until {fmtDate(status.device.expiresAt)}.</p>
                )}
              </Card>

              {!userHash ? (
                <Card className="p-6 space-y-3">
                  <p className="font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Unlock your Cloud ID</p>
                  <p className="text-sm text-muted-foreground">
                    Classic is tied to your Cloud ID key, so it can follow you to your other devices.
                  </p>
                  {storedMethod === null ? (
                    <p className="text-sm text-muted-foreground">
                      No Cloud ID on this device yet. <Link to="/cloud-backup" className="underline">Set one up in Cloud Backup</Link>, then come back.
                    </p>
                  ) : storedMethod === "webauthn" ? (
                    <Button onClick={unlock} disabled={busy === "unlock"} className="w-full">
                      {busy === "unlock" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
                      Unlock Cloud ID
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input type="password" inputMode="numeric" placeholder="Cloud ID PIN" value={pin}
                        onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} autoComplete="off" />
                      <Button onClick={unlock} disabled={!pin || busy === "unlock"}>
                        {busy === "unlock" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <>
                  <Card className="p-6 space-y-3">
                    <p className="font-medium">
                      {keyActive ? `Your key is on Classic until ${fmtDate(key!.expiresAt)}` : "Your key is on Regular"}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="classic-email">Email for the receipt</Label>
                      <Input id="classic-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                    <Button onClick={buy} disabled={busy === "buy"} className="w-full">
                      {busy === "buy" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
                      {keyActive ? "Add another month" : "Get Classic"} — {info.currency} {info.price.toLocaleString()}
                    </Button>
                  </Card>

                  {keyActive && (
                    <Card className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Devices on this key</p>
                        <span className="text-xs text-muted-foreground">{key!.devices.length}/{info.maxDevices}</span>
                      </div>
                      {key!.devices.length === 0 && <p className="text-sm text-muted-foreground">No devices yet.</p>}
                      {key!.devices.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <Laptop className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate">{d.label || "Device"} {d.thisDevice && <Badge variant="secondary" className="ml-1 text-[10px]">This device</Badge>}</p>
                              <p className="text-xs text-muted-foreground font-mono">ID {d.id} · added {fmtDate(d.boundAt)}</p>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" aria-label="Remove device" onClick={() => unbind(d.id)} disabled={busy === `unbind-${d.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {!key!.deviceBoundHere && (
                        <Button onClick={bind} disabled={busy === "bind" || key!.devices.length >= info.maxDevices} variant="outline" className="w-full">
                          {busy === "bind" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Use Classic on this device
                        </Button>
                      )}
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
