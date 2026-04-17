-- Add OCR + matching fields to documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ocr_data jsonb,
  ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS vat_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'DKK',
  ADD COLUMN IF NOT EXISTS outlook_message_id text,
  ADD COLUMN IF NOT EXISTS attachment_id text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- Unique index for dedup of incoming Outlook attachments per company
CREATE UNIQUE INDEX IF NOT EXISTS documents_company_outlook_msg_idx
  ON public.documents (company_id, outlook_message_id, attachment_id)
  WHERE outlook_message_id IS NOT NULL;

-- Index for matching by amount/date
CREATE INDEX IF NOT EXISTS documents_company_amount_date_idx
  ON public.documents (company_id, amount, date);
CREATE INDEX IF NOT EXISTS transactions_company_amount_date_idx
  ON public.transactions (company_id, amount, date);

-- Storage bucket for receipt files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for receipts bucket — owners of the company can manage their files
-- Path convention: {company_id}/{document_id}.{ext}
CREATE POLICY "Company owners can read receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owners can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owners can update receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owners can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
);