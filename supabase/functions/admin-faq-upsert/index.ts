import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const id = ctx.body.id ? String(ctx.body.id) : null;
  const question = String(ctx.body.question ?? "").trim();
  const answer = String(ctx.body.answer ?? "").trim();
  const published = ctx.body.published === false ? false : true;
  const sortOrder = Number.isFinite(ctx.body.sortOrder as number) ? Number(ctx.body.sortOrder) : 0;
  const sourceTicketId = ctx.body.sourceTicketId ? String(ctx.body.sourceTicketId) : null;

  if (question.length < 3 || question.length > 300) return json({ error: "Question must be 3–300 chars" }, 400);
  if (answer.length < 3 || answer.length > 5000) return json({ error: "Answer must be 3–5000 chars" }, 400);

  if (id) {
    const { error } = await ctx.service.from("faqs")
      .update({ question, answer, published, sort_order: sortOrder })
      .eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id });
  }
  const { data, error } = await ctx.service.from("faqs")
    .insert({ question, answer, published, sort_order: sortOrder, source_ticket_id: sourceTicketId })
    .select("id").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, id: data?.id });
});
