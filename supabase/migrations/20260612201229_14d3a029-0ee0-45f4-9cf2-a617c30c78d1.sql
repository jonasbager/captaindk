
-- Fix MISSING_INSERT_CHECK_POLICY on 4 tables
DROP POLICY IF EXISTS "Company owners can manage documents" ON public.documents;
CREATE POLICY "Company owners can manage documents" ON public.documents
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = documents.company_id AND companies.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = documents.company_id AND companies.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owners can manage invoices" ON public.invoices;
CREATE POLICY "Company owners can manage invoices" ON public.invoices
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = invoices.company_id AND companies.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = invoices.company_id AND companies.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owners can manage journal entries" ON public.journal_entries;
CREATE POLICY "Company owners can manage journal entries" ON public.journal_entries
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = journal_entries.company_id AND companies.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = journal_entries.company_id AND companies.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owners can manage transactions" ON public.transactions;
CREATE POLICY "Company owners can manage transactions" ON public.transactions
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = transactions.company_id AND companies.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.companies WHERE companies.id = transactions.company_id AND companies.owner_id = auth.uid()));

-- Lock down user_roles writes (only service_role can modify)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

-- Restrict EXECUTE on SECURITY DEFINER trigger functions (they are only called by triggers, not API)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_to_jonas() FROM PUBLIC, anon, authenticated;
