-- Grant admin to existing user if exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'jonas@bager.dk'
ON CONFLICT (user_id, role) DO NOTHING;

-- Trigger function to auto-grant admin to jonas@bager.dk on signup
CREATE OR REPLACE FUNCTION public.grant_admin_to_jonas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'jonas@bager.dk' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_admin_to_jonas_trigger ON auth.users;
CREATE TRIGGER grant_admin_to_jonas_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_to_jonas();