// Shared, fail-CLOSED rate limiting for public edge functions.
// Subjects are stored only as salted SHA-256 hashes of the client IP.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface RateLimitResult {
  allowed: boolean;
  /** Human-readable reason when not allowed. */
  message?: string;
}

/**
 * Increments the counter for (bucket, ip-hash) and returns whether the request
 * may proceed. Fails CLOSED: any RPC error denies the request.
 */
export async function checkRateLimit(
  service: SupabaseClient,
  req: Request,
  bucket: string,
  limit: number,
): Promise<RateLimitResult> {
  try {
    const subject = await sha256Hex(`${bucket}:${clientIp(req)}`);
    const { data, error } = await service.rpc("bump_rate_limit", {
      _bucket: bucket,
      _subject: subject,
      _limit: limit,
    });
    if (error) {
      console.error("rate limit check failed", bucket, error);
      return { allowed: false, message: "Rate limit check failed; please try again shortly." };
    }
    if (data !== true) {
      return { allowed: false, message: "Too many requests. Please try again later." };
    }
    return { allowed: true };
  } catch (e) {
    console.error("rate limit exception", bucket, e);
    return { allowed: false, message: "Rate limit check failed; please try again shortly." };
  }
}
