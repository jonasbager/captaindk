-- SKAT engine foundation
-- Fixes the structural gap: kontoplan was hardcoded in the frontend with no VAT codes,
-- and journal_entries had no VAT split. Neither moms nor rubrik calc is possible without this.

-- 1. Company type drives which reports apply
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'enkeltmandsvirksomhed'
    CHECK (company_type IN ('enkeltmandsvirksomhed', 'aps')),
  ADD COLUMN IF NOT EXISTS vat_period TEXT NOT NULL DEFAULT 'halvaarlig'
    CHECK (vat_period IN ('maanedlig', 'kvartalsvis', 'halvaarlig'));

-- 2. Real chart of accounts (replaces the hardcoded frontend array)
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('revenue','expense','asset','liability','equity')),
  -- VAT treatment when posting to this account (see engine for semantics)
  vat_code TEXT NOT NULL DEFAULT 'NONE' CHECK (vat_code IN (
    'U25',   -- dansk salg, 25% salgsmoms
    'UEUV',  -- EU-salg varer (0%, rubrik B-varer + EU-salg uden moms)
    'UEUY',  -- EU-salg ydelser (0%, rubrik B-ydelser)
    'UEKS',  -- eksport uden for EU (0%, rubrik C)
    'I25',   -- dansk køb, 25% købsmoms
    'IEUV',  -- EU varekøb, omvendt betalingspligt (rubrik A-varer)
    'IEUY',  -- EU ydelseskøb, omvendt betalingspligt (rubrik A-ydelser)
    'IVKU',  -- varekøb uden for EU (importmoms)
    'REP',   -- repræsentation (25% momsfradrag, 25% skattefradrag for ApS-korrektion)
    'NONE'   -- momsfri
  )),
  -- Semantic tax line for report mapping (engine resolves to rubrik numbers per company_type)
  tax_line TEXT,            -- e.g. 'nettoomsaetning','vareforbrug','fremmed_arbejde',
                            -- 'andre_driftsomkostninger','afskrivninger','renteindtaegter',
                            -- 'renteudgifter','anlaegsaktiver','omsaetningsaktiver',
                            -- 'egenkapital','skyldig_moms','anden_gaeld','repraesentation','boeder'
  energy_levy TEXT,         -- 'elafgift' | 'vandafgift' | 'olie_flaskegas' | 'naturgas_bygas' | null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, number)
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owners can manage accounts" ON public.accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = accounts.company_id AND owner_id = auth.uid())
);
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. VAT split on journal entries (amount stays gross for backwards compat)
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_code TEXT NOT NULL DEFAULT 'NONE';

-- 4. Seed the standard kontoplan for a company (call on onboarding; safe to re-run)
CREATE OR REPLACE FUNCTION public.seed_default_kontoplan(p_company_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.accounts (company_id, number, name, kind, vat_code, tax_line, energy_levy) VALUES
    (p_company_id, 1000, 'Nettoomsætning',                  'revenue',  'U25',  'nettoomsaetning', NULL),
    (p_company_id, 1010, 'Salg af varer',                   'revenue',  'U25',  'nettoomsaetning', NULL),
    (p_company_id, 1020, 'Salg af konsulentydelser',        'revenue',  'U25',  'nettoomsaetning', NULL),
    (p_company_id, 1030, 'Salg af ydelser EU',              'revenue',  'UEUY', 'nettoomsaetning', NULL),
    (p_company_id, 1040, 'Salg af varer EU',                'revenue',  'UEUV', 'nettoomsaetning', NULL),
    (p_company_id, 1050, 'Eksport uden for EU',             'revenue',  'UEKS', 'nettoomsaetning', NULL),
    (p_company_id, 1100, 'Øvrige indtægter',                'revenue',  'U25',  'andre_indtaegter', NULL),
    (p_company_id, 2000, 'Vareforbrug',                     'expense',  'I25',  'vareforbrug', NULL),
    (p_company_id, 2050, 'Varekøb EU',                      'expense',  'IEUV', 'vareforbrug', NULL),
    (p_company_id, 2060, 'Varekøb uden for EU',             'expense',  'IVKU', 'vareforbrug', NULL),
    (p_company_id, 2100, 'Fremmed arbejde / underleverandører','expense','I25', 'fremmed_arbejde', NULL),
    (p_company_id, 3600, 'Husleje',                         'expense',  'NONE', 'andre_driftsomkostninger', NULL),
    (p_company_id, 3610, 'El, vand, varme',                 'expense',  'I25',  'andre_driftsomkostninger', 'elafgift'),
    (p_company_id, 3615, 'Småanskaffelser',                 'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3620, 'Kontorartikler',                  'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3630, 'Software / abonnementer',         'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3635, 'Software / abonnementer EU',      'expense',  'IEUY', 'andre_driftsomkostninger', NULL),
    (p_company_id, 3640, 'Telefon',                         'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3650, 'Internet',                        'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3660, 'Forsikringer',                    'expense',  'NONE', 'andre_driftsomkostninger', NULL),
    (p_company_id, 3670, 'Repræsentation',                  'expense',  'REP',  'repraesentation', NULL),
    (p_company_id, 3680, 'Rejseudgifter',                   'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3690, 'Markedsføring',                   'expense',  'I25',  'andre_driftsomkostninger', NULL),
    (p_company_id, 3700, 'Revisor / advokat',               'expense',  'I25',  'revisor_advokat', NULL),
    (p_company_id, 3750, 'Bøder og gebyrer (ej fradrag)',   'expense',  'NONE', 'boeder', NULL),
    (p_company_id, 3800, 'Bankgebyrer',                     'expense',  'NONE', 'andre_driftsomkostninger', NULL),
    (p_company_id, 3900, 'Afskrivninger',                   'expense',  'NONE', 'afskrivninger', NULL),
    (p_company_id, 4100, 'Renteindtægter',                  'revenue',  'NONE', 'renteindtaegter', NULL),
    (p_company_id, 4200, 'Renteudgifter',                   'expense',  'NONE', 'renteudgifter', NULL),
    (p_company_id, 5000, 'Bankkonto',                       'asset',    'NONE', 'omsaetningsaktiver', NULL),
    (p_company_id, 5100, 'Tilgodehavender fra kunder',      'asset',    'NONE', 'omsaetningsaktiver', NULL),
    (p_company_id, 5200, 'Andre tilgodehavender',           'asset',    'NONE', 'omsaetningsaktiver', NULL),
    (p_company_id, 5500, 'Driftsmidler og inventar',        'asset',    'I25',  'anlaegsaktiver', NULL),
    (p_company_id, 6000, 'Egenkapital',                     'equity',   'NONE', 'egenkapital', NULL),
    (p_company_id, 6100, 'Skyldige omkostninger',           'liability','NONE', 'anden_gaeld', NULL),
    (p_company_id, 6200, 'Skyldig moms',                    'liability','NONE', 'skyldig_moms', NULL),
    (p_company_id, 6300, 'Skyldig selskabsskat',            'liability','NONE', 'anden_gaeld', NULL)
  ON CONFLICT (company_id, number) DO NOTHING;
END;
$$;
