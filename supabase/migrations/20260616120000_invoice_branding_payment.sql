-- Faktura: logo, betalingsoplysninger og standard betalingsfrist på virksomheden.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_reg TEXT,
  ADD COLUMN IF NOT EXISTS bank_konto TEXT,
  ADD COLUMN IF NOT EXISTS mobilepay TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS swift TEXT,
  ADD COLUMN IF NOT EXISTS default_payment_terms INTEGER NOT NULL DEFAULT 8;

-- Privat bucket til virksomhedens logo (samme mønster som receipts/invoices).
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Company owners read branding" ON storage.objects;
CREATE POLICY "Company owners read branding" ON storage.objects FOR SELECT USING (
  bucket_id = 'branding'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Company owners upload branding" ON storage.objects;
CREATE POLICY "Company owners upload branding" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'branding'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Company owners update branding" ON storage.objects;
CREATE POLICY "Company owners update branding" ON storage.objects FOR UPDATE USING (
  bucket_id = 'branding'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Company owners delete branding" ON storage.objects;
CREATE POLICY "Company owners delete branding" ON storage.objects FOR DELETE USING (
  bucket_id = 'branding'
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND c.owner_id = auth.uid())
);
