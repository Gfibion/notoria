import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, CheckCircle2, Copy, Fingerprint, Link2, Loader2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { loadWrappedSecret } from "@/lib/cloud-keystore";
import { unwrapSecretWithPin, unwrapSecretWithBiometric, deriveUserHash } from "@/lib/cloud-crypto";
import { SUPPORT_TIERS, tierForAmount, type SupportTierId } from "@/lib/support-tiers";

type Currency = "NGN" | "USD" | "GHS" | "KES" | "ZAR";

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function PaymentConfirmedPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref") || "";

  const [verifying, setVerifying] = useState(true);
  const [paid, setPaid] = useState<{ amount: number; currency: string; tier: SupportTierId } | null>(null);
  const [rawStatus, setRawStatus] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [storedMethod, setStoredMethod] = useState<"pin" | "webauthn" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activatedTier, setActivatedTier] = useState<SupportTierId | null>(null);

  useEffect(() => {
    (async () => {
      const w = await loadWrappedSecret();
      if (w) {
        setHasStoredKey(true);
        setStoredMethod(w.method === "webauthn" ? "webauthn" : "pin");
      }
    })();
  }, []);

  const verify = useCallback(async (ref: string) => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference: ref },
      });
      if (error) throw new Error("Could not verify your payment");
      if (data.status === "succeeded") {
        const tier = (typeof data.tier === "string" && SUPPORT_TIERS[data.tier as SupportTierId]
          ? data.tier
          : tierForAmount(data.amount / 100, data.currency)) as SupportTierId;
        setPaid({ amount: data.amount / 100, currency: data.currency, tier });
      } else {
        setRawStatus(String(data.status ?? "unknown"));
      }
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Could not verify your payment");
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (reference) verify(reference);
    else setVerifying(false);
  }, [reference, verify]);

  // ─── Activate on this device: unlock Cloud ID → link payment ──────
  const activateOnThisDevice = async (pin?: string) => {
    if (!reference) return;
    setBusy(true);
    try {
      const w = await loadWrappedSecret();
      if (!w) throw new Error("No Cloud ID is saved on this device");
      const secret = w.method === "webauthn"
        ? await unwrapSecretWithBiometric(w)
        : await unwrapSecretWithPin(w, pin ?? pinInput);
      const userHash = await deriveUserHash(secret);
      const { data, error } = await supabase.functions.invoke("link-support-payment", {
        body: { reference, user_hash: userHash },
      });
      if (error) {
        let msg = "Could not link this payment";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            const body = await ctx.json().catch(() => null);
            if (body?.error) msg = String(body.error);
          }
        } catch { /* keep default */ }
        throw new Error(msg);
      }
      setActivatedTier((data.tier ?? "supporter") as SupportTierId);
      setPinInput("");
      toast.success("Your support is now linked to this device");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link this payment");
    } finally {
      setBusy(false);
    }
  };

  const tier = activatedTier ?? paid?.tier ?? null;
  const tierInfo = tier ? SUPPORT_TIERS[tier] : null;

  return (
    <>
      <SEO
        path="/payment-confirmed"
        title="Payment confirmed"
        description="Your Novaryn support payment confirmation — your plan and account activation steps."
        noindex
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
        <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/coffee"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
            </Button>
            <h1 className="font-display text-lg font-semibold">Payment Confirmation</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 md:py-10 space-y-6">
          {verifying && (
            <Card className="p-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Verifying your payment…</p>
            </Card>
          )}

          {!verifying && !reference && (
            <Card className="p-6 text-center space-y-3">
              <p className="font-medium">No payment reference found</p>
              <p className="text-sm text-muted-foreground">
                If you just paid, return to the support page — your receipt link is emailed to you as well.
              </p>
              <Button asChild><Link to="/coffee">Go to Support Novaryn</Link></Button>
            </Card>
          )}

          {!verifying && verifyError && (
            <Card className="p-6 text-center space-y-3">
              <XCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="font-medium">{verifyError}</p>
              <Button variant="outline" onClick={() => reference && verify(reference)}>Try again</Button>
            </Card>
          )}

          {!verifying && !verifyError && reference && !paid && (
            <Card className="p-6 text-center space-y-3">
              <XCircle className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Payment not completed</p>
              <p className="text-sm text-muted-foreground">
                Status: {rawStatus ?? "unknown"}. You can try again any time.
              </p>
              <Button asChild variant="outline"><Link to="/coffee">Back to Support Novaryn</Link></Button>
            </Card>
          )}

          {!verifying && paid && (
            <>
              <Card className="p-6 md:p-8 text-center space-y-4">
                <div className="inline-flex w-16 h-16 rounded-full bg-green-500/10 items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">Payment received — thank you!</h2>
                  <p className="text-muted-foreground mt-1">
                    {formatMoney(paid.amount, paid.currency)} · Ref {reference}
                  </p>
                </div>
              </Card>

              <Card className="p-6 md:p-8 space-y-4">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Your plan</p>
                <div className="flex items-center gap-3">
                  <div className="inline-flex w-12 h-12 rounded-full bg-amber-500/10 items-center justify-center flex-shrink-0">
                    <span className="text-amber-600 font-bold text-lg">
                      {tierInfo?.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-display font-semibold">{tierInfo?.name}</p>
                    <p className="text-sm text-muted-foreground">{tierInfo?.blurb}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 md:p-8 space-y-4">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Activate your Novaryn account
                </p>

                {activatedTier ? (
                  <div className="flex items-start gap-3 text-sm bg-green-500/10 border border-green-600/20 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p>
                      <span className="font-medium">Activated.</span> Your {SUPPORT_TIERS[activatedTier].name} plan
                      is linked to this device's Cloud ID. Open Novaryn and it's already in effect.
                    </p>
                  </div>
                ) : (
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="font-semibold text-amber-600">1.</span>
                      <span>Open Novaryn on this device and start using the app — no sign-up needed.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-amber-600">2.</span>
                      <span>
                        Your support is linked to your Cloud ID automatically. If you unlock your Cloud ID below,
                        this payment is attached to it right away.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-amber-600">3.</span>
                      <span>
                        Paid on a different device? Open that device's confirmation page, or unlock your Cloud ID
                        here — your plan follows your Cloud ID, not the browser.
                      </span>
                    </li>
                  </ol>
                )}

                {!activatedTier && (
                  <div className="border border-border/60 rounded-lg p-4 space-y-3">
                    {hasStoredKey ? (
                      storedMethod === "webauthn" ? (
                        <Button onClick={() => activateOnThisDevice()} disabled={busy} className="w-full">
                          {busy
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Linking…</>
                            : <><Fingerprint className="w-4 h-4 mr-2" /> Unlock Cloud ID & link this payment</>}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="activate-pin">Enter your Cloud ID PIN to link this payment</Label>
                          <div className="flex gap-2">
                            <Input
                              id="activate-pin"
                              type="password"
                              inputMode="numeric"
                              value={pinInput}
                              onChange={(e) => setPinInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && activateOnThisDevice()}
                              placeholder="Cloud ID PIN"
                              autoComplete="off"
                            />
                            <Button onClick={() => activateOnThisDevice()} disabled={busy || !pinInput}>
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No Cloud ID is saved on this device yet. Open Novaryn → Settings → Cloud Backup to
                        activate one, then come back to this page to link your payment.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">Ref {reference}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(reference);
                      toast.success("Reference copied");
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                </div>
              </Card>
            </>
          )}

          <div className="text-center">
            <Button variant="ghost" asChild>
              <Link to="/app">Open Novaryn</Link>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
