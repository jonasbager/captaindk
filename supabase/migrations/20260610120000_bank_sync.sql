-- Bank sync via Enable Banking (PSD2 AIS)

-- Connected bank accounts (one row per account, a bank consent can yield several)
CREATE TABLE public.bank_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'enablebanking',
  session_id TEXT NOT NULL,
  account_uid TEXT NOT NULL,
  account_name TEXT,
  iban TEXT,
  currency TEXT NOT NULL DEFAULT 'DKK',
  aspsp_name TEXT,
  aspsp_country TEXT NOT NULL DEFAULT 'DK',
  valid_until TIMESTAMPTZ,                -- PSD2 consent expiry (max 180 days, typically 90)
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',  -- active | expired | revoked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, account_uid)
);
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owners can manage bank connections" ON public.bank_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = bank_connections.company_id AND owner_id = auth.uid())
);
CREATE TRIGGER update_bank_connections_updated_at BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short-lived state for the OAuth-style redirect (bank-connect writes, bank-callback consumes)
CREATE TABLE public.bank_auth_states (
  state UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  aspsp_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_auth_states ENABLE ROW LEVEL SECURITY;
-- Only edge functions (service role) touch this table; no user policies on purpose.

-- Extend transactions for bank-sourced rows + idempotent re-sync
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS counterparty TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'DKK',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'booked'; -- booked | pending

-- Dedup: same external transaction never imported twice for a company
CREATE UNIQUE INDEX IF NOT EXISTS transactions_company_external_id_key
  ON public.transactions (company_id, external_id)
  WHERE external_id IS NOT NULL;
