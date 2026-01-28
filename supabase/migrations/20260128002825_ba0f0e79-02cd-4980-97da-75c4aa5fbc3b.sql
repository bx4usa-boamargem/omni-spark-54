ALTER TABLE public.landing_pages
ADD COLUMN IF NOT EXISTS user_id uuid;

COMMENT ON COLUMN public.landing_pages.user_id IS 'ID do usuário que criou a página';