-- seed_default_kontoplan blev aldrig kaldt nogen steder fra — nye virksomheder
-- fik nul konti, så hverken chat-bogføring eller Kontoplan virkede.
-- Trigger på companies-insert dækker alle oprettelsesveje (onboarding, SQL, API).

CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_kontoplan(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- Backfill: eksisterende virksomheder uden kontoplan
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT id FROM public.companies co
    WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.company_id = co.id)
  LOOP
    PERFORM public.seed_default_kontoplan(c.id);
  END LOOP;
END;
$$;
