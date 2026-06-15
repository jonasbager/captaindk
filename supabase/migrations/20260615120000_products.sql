-- Produkter/ydelser — bruges i fakturalinjer og importeres ved migrering fra Dinero/Billy.
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate INTEGER NOT NULL DEFAULT 25,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company owners can manage products" ON public.products;
CREATE POLICY "Company owners can manage products" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies WHERE id = products.company_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies WHERE id = products.company_id AND owner_id = auth.uid()));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
