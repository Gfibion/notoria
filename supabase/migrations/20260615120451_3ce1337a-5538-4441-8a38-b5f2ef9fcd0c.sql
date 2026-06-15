
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE,
  access_token text NOT NULL,
  reason text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  user_hash text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access tickets" ON public.tickets FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX tickets_status_idx ON public.tickets(status, updated_at DESC);
CREATE INDEX tickets_number_idx ON public.tickets(ticket_number);

CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access ticket_messages" ON public.ticket_messages FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages(ticket_id, created_at);

CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  source_ticket_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access faqs" ON public.faqs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX faqs_pub_idx ON public.faqs(published, sort_order);

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
