-- Hvilke betalingsmetoder vises på fakturaer. Nøgler: 'bank', 'mobilepay', 'iban'.
-- companies.invoice_default_methods = dem der er slået til som standard.
-- invoices.payment_methods = dem der faktisk blev valgt på den enkelte faktura.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS invoice_default_methods TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[];
