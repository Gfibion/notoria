import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Coffee, Loader2, Heart, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PolarProduct {
  id: string;
  name: string;
  description?: string | null;
  prices: Array<{
    id: string;
    price_amount?: number | null;
    price_currency?: string | null;
    amount_type?: string;
    type?: string;
  }>;
}

const formatPrice = (amount?: number | null, currency?: string | null) => {
  if (amount == null || !currency) return "Custom amount";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export default function Coffee() {
  const [products, setProducts] = useState<PolarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<{ status: string; name?: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("polar-products");
        if (error) throw error;
        setProducts(data?.items || []);
      } catch (e) {
        toast.error("Could not load coffee options");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const checkoutId = searchParams.get("checkout_id");
    if (!checkoutId) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          `polar-verify?checkout_id=${encodeURIComponent(checkoutId)}`,
          { method: "GET" }
        );
        if (error) throw error;
        setVerifyState({ status: data.status, name: data.product_name });
        if (data.status === "succeeded") toast.success("Thank you for the coffee! ☕");
      } catch (e) {
        console.error(e);
        toast.error("Could not verify your purchase");
      } finally {
        searchParams.delete("checkout_id");
        setSearchParams(searchParams, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (productId: string) => {
    setCheckoutLoading(productId);
    try {
      const successUrl = `${window.location.origin}/coffee`;
      const { data, error } = await supabase.functions.invoke("polar-checkout", {
        body: { product_id: productId, success_url: successUrl },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not start checkout");
      setCheckoutLoading(null);
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
            <CoffeeIcon className="w-5 h-5 text-amber-600" />
            <h1 className="font-display text-lg font-semibold">Notoria Coffee</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {verifyState && (
          <Card className="p-4 mb-6 flex items-start gap-3">
            {verifyState.status === "succeeded" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {verifyState.status === "succeeded"
                  ? `Thank you for supporting Notoria!`
                  : `Checkout status: ${verifyState.status}`}
              </p>
              {verifyState.name && (
                <p className="text-sm text-muted-foreground">{verifyState.name}</p>
              )}
            </div>
          </Card>
        )}

        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex w-16 h-16 rounded-full bg-amber-500/10 items-center justify-center">
            <Heart className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-3xl font-display font-bold">Buy Me Coffee</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            If Notoria helps you stay organized, consider buying a coffee to support
            ongoing development. Every cup matters ☕
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No coffee options available yet. Please check back soon.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {products.map((p) => {
              const price = p.prices?.[0];
              return (
                <Card key={p.id} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      {p.description && (
                        <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                      )}
                    </div>
                    <CoffeeIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  </div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-500">
                    {formatPrice(price?.price_amount, price?.price_currency)}
                  </div>
                  <Button
                    onClick={() => handleBuy(p.id)}
                    disabled={checkoutLoading === p.id}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {checkoutLoading === p.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" /> Support
                      </>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-10">
          Secure payments processed by Polar.sh
        </p>
      </main>
    </div>
  );
}
