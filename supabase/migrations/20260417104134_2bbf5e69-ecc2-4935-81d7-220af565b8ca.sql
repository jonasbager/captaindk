DROP POLICY IF EXISTS "Company owners can read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can delete receipts" ON storage.objects;

CREATE POLICY "Company owners can read receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owners can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owners can update receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owners can delete receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.owner_id = auth.uid()
  )
);