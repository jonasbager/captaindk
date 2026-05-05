ALTER TABLE public.waitlist ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.waitlist ALTER COLUMN company DROP NOT NULL;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'landing';