// Support tiers shown after a successful Paystack contribution.
// Thresholds are in MAJOR currency units (e.g. 5 = 5 USD).
export type SupportTierId = "supporter" | "backer" | "champion";

export interface SupportTier {
  id: SupportTierId;
  name: string;
  blurb: string;
}

export const SUPPORT_TIERS: Record<SupportTierId, SupportTier> = {
  supporter: {
    id: "supporter",
    name: "Supporter",
    blurb: "Thank you — your contribution helps keep Novaryn independent and improving.",
  },
  backer: {
    id: "backer",
    name: "Backer",
    blurb: "A generous boost. Backers keep servers, updates and support running.",
  },
  champion: {
    id: "champion",
    name: "Champion",
    blurb: "Outstanding support. Champions power the future of Novaryn.",
  },
};

const TIER_THRESHOLDS: Record<string, { backer: number; champion: number }> = {
  USD: { backer: 5, champion: 10 },
  NGN: { backer: 2500, champion: 5000 },
  GHS: { backer: 25, champion: 50 },
  KES: { backer: 250, champion: 500 },
  ZAR: { backer: 100, champion: 200 },
};

/** Tier for an amount in major units (e.g. 5 = 5 NGN). Defaults to supporter. */
export function tierForAmount(amountMajor: number, currency: string): SupportTierId {
  const t = TIER_THRESHOLDS[currency.toUpperCase()];
  if (!t) return "supporter";
  if (amountMajor >= t.champion) return "champion";
  if (amountMajor >= t.backer) return "backer";
  return "supporter";
}
