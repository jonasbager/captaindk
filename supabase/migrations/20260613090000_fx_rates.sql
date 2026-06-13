-- Valutakurs-cache: dagskurser (DKK pr. 1 enhed fremmed valuta), så vi ikke
-- kalder det eksterne API for hver bogføring. Referencedata — ikke firmadata —
-- så alle indloggede må læse; kun service_role (edge function) skriver.
CREATE TABLE IF NOT EXISTS public.fx_rates (
  date      DATE NOT NULL,
  currency  TEXT NOT NULL,
  rate      NUMERIC(16,6) NOT NULL,  -- DKK pr. 1 enhed af 'currency'
  source    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date, currency)
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read fx rates" ON public.fx_rates;
CREATE POLICY "Authenticated can read fx rates" ON public.fx_rates
  FOR SELECT TO authenticated USING (true);
