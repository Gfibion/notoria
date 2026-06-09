// Shared helper: verify caller is an admin (or master admin).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AdminRow {
  id: string;
  user_id: string;
  email: string;
  role: "master" | "invited";
}

export interface AdminContext {
  userId: string;
  email: string;
  admin: AdminRow | null;
  service: SupabaseClient;
}

/**
 * Validates the bearer JWT and returns the user + admin row (if any).
 * If `requireMaster` is true, rejects non-master callers.
 */
export async function requireAdmin(
  req: Request,
  opts: { requireMaster?: boolean; allowAnyAuthed?: boolean } = {},
): Promise<AdminContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.slice(7);
  const { data: userData, error: userErr } = await service.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const userId = userData.user.id;
  const email = userData.user.email ?? "";

  const { data: admin } = await service
    .from("admins")
    .select("id, user_id, email, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!admin && !opts.allowAnyAuthed) return json({ error: "Forbidden" }, 403);
  if (opts.requireMaster && admin?.role !== "master") return json({ error: "Master admin only" }, 403);

  return { userId, email, admin: admin as AdminRow | null, service };
}
