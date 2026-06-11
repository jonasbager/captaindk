-- Rubrik 323 på det rigtige oplysningsskema er "Salgsfremmende udgifter",
-- ikke en samlepost. Markedsføring flyttes til ny tax_line 'salgsfremmende'
-- (repræsentation beholder sin egen tax_line, men tælles med i rubrik 323 af enginen).

UPDATE public.accounts
SET tax_line = 'salgsfremmende'
WHERE number = 3690 AND tax_line = 'andre_driftsomkostninger';

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
    (p_company_id, 3690, 'Markedsføring',                   'expense',  'I25',  'salgsfremmende', NULL),
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
