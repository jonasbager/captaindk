-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL DEFAULT '',
  structured_data jsonb,
  attachments jsonb,
  tool_calls jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_company_created ON public.chat_messages (company_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners manage chat messages"
ON public.chat_messages FOR ALL
USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = chat_messages.company_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = chat_messages.company_id AND c.owner_id = auth.uid()));

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  cvr text,
  email text,
  address text,
  default_payment_terms integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers (company_id);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners manage customers"
ON public.customers FOR ALL
USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = customers.company_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = customers.company_id AND c.owner_id = auth.uid()));

CREATE TRIGGER trg_customers_updated
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend invoices
ALTER TABLE public.invoices
  ADD COLUMN customer_id uuid,
  ADD COLUMN total_excl_vat numeric NOT NULL DEFAULT 0,
  ADD COLUMN total_vat numeric NOT NULL DEFAULT 0,
  ADD COLUMN pdf_url text,
  ADD COLUMN journal_entry_id uuid,
  ADD COLUMN payment_journal_entry_id uuid,
  ADD COLUMN sent_at timestamptz,
  ADD COLUMN paid_at timestamptz;

CREATE TRIGGER trg_invoices_updated
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices','invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company owners read invoices files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);

CREATE POLICY "Company owners upload invoices files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);

CREATE POLICY "Company owners update invoices files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invoices'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);

CREATE POLICY "Company owners delete invoices files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);
