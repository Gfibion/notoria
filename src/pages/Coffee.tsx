import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Coffee, Loader2, Heart, CheckCircle2, XCircle,
  ShieldCheck, CreditCard, Smartphone, Landmark, Lock,
} from "lucide-react";
import { toast } from "sonner";

type Currency = "NGN" | "USD" | "GHS" | "KES" | "ZAR";

const CURRENCIES: { code: Currency; label: string; symbol: string; presets: number[] }[] = [
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", presets: [1000, 2500, 5000, 10000] },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "₵", presets: [10, 25, 50, 100] },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh", presets: [100, 250, 500, 1000] },
  { code: "ZAR", label: "South African Rand", symbol: "R", presets: [50, 100, 200, 500] },
  { code: "USD", label: "US Dollar", symbol: "$", presets: [3, 5, 10, 25] },
];

const formatMoney = (amount: number, currency: Currency) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function CoffeePage() {
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState<number>(2500);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyState, setVerifyState] = useState<{ status: string; amount?: number; currency?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const meta = CURRENCIES.find(c => c.code === currency)!;

  useEffect(() => {
    setAmount(meta.presets[1]);
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) return;
    setVerifying(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          `paystack-verify?reference=${encodeURIComponent(reference)}`,
          { method: "GET" }
        );
        if (error) throw error;
        setVerifyState({
          status: data.status,
          amount: typeof data.amount === "number" ? data.amount / 100 : undefined,
          currency: data.currency,
        });
        if (data.status === "succeeded") toast.success("Thank you for the support! ☕");
      } catch (e) {
        console.error(e);
        toast.error("Could not verify your payment");
      } finally {
        setVerifying(false);
        searchParams.delete("reference");
        searchParams.delete("trxref");
        setSearchParams(searchParams, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSupport = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/coffee`;
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          email: email.trim(),
          amount,
          currency,
          callback_url: callbackUrl,
          channels: ["card", "bank", "ussd", "mobile_money", "bank_transfer", "qr"],
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not start payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-600" />
            <h1 className="font-display text-lg font-semibold">Support Notoria</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:py-10">
        {(verifying || verifyState) && (
          <Card className="p-4 mb-6 flex items-start gap-3">
            {verifying ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-0.5" />
            ) : verifyState?.status === "succeeded" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {verifying
                  ? "Verifying your payment..."
                  : verifyState?.status === "succeeded"
                    ? "Thank you for supporting Notoria!"
                    : `Payment status: ${verifyState?.status ?? "unknown"}`}
              </p>
              {verifyState?.amount != null && verifyState?.currency && (
                <p className="text-sm text-muted-foreground">
                  {formatMoney(verifyState.amount, verifyState.currency.toUpperCase() as Currency)} received
                </p>
              )}
            </div>
          </Card>
        )}

        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex w-16 h-16 rounded-full bg-amber-500/10 items-center justify-center">
            <Heart className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-3xl font-display font-bold">Buy Me Coffee</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            If Notoria helps you stay organized, a small contribution keeps development going. Every cup matters ☕
          </p>
        </div>

        <Card className="p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger id="currency" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount ({meta.symbol})</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                step="any"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {meta.presets.map(p => (
              <Button
                key={p}
                type="button"
                variant={amount === p ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(p)}
                className={amount === p ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
              >
                {meta.symbol}{p.toLocaleString()}
              </Button>
            ))}
          </div>

          <div>
            <Label htmlFor="email">Email (for receipt)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5"
              autoComplete="email"
            />
          </div>

          <Button
            onClick={handleSupport}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing secure checkout...</>
            ) : (
              <><Heart className="w-4 h-4 mr-2" /> Support with {formatMoney(amount || 0, currency)}</>
            )}
          </Button>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground p-2 rounded-md bg-accent/30">
              <CreditCard className="w-4 h-4" />
              Cards
            </div>
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground p-2 rounded-md bg-accent/30">
              <Landmark className="w-4 h-4" />
              Bank / USSD
            </div>
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground p-2 rounded-md bg-accent/30">
              <Smartphone className="w-4 h-4" />
              Mobile Money
            </div>
          </div>
        </Card>

        <div className="mt-6 flex items-start gap-3 text-sm text-muted-foreground bg-accent/20 border border-border/60 rounded-lg p-4">
          <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Your payment is secure
            </p>
            <p className="mt-1">
              Payments are processed on a PCI-DSS certified, bank-grade encrypted gateway.
              Notoria never sees or stores your card, bank, or mobile-money credentials.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
