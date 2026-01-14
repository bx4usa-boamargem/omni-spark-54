-- Add public_blog_enabled column if not exists
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS public_blog_enabled BOOLEAN DEFAULT true;

-- Normalize existing platform_subdomain values (remove .omniseen.app suffix)
UPDATE public.blogs 
SET platform_subdomain = REPLACE(platform_subdomain, '.omniseen.app', '')
WHERE platform_subdomain LIKE '%.omniseen.app';

-- Also remove any https:// prefix if present
UPDATE public.blogs 
SET platform_subdomain = REPLACE(platform_subdomain, 'https://', '')
WHERE platform_subdomain LIKE 'https://%';

-- Create unique index on platform_subdomain for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_blogs_platform_subdomain_unique 
ON public.blogs(platform_subdomain) 
WHERE platform_subdomain IS NOT NULL AND platform_subdomain != '';

-- Migrate specific accounts with clean slugs
UPDATE public.blogs SET platform_subdomain = 'clickone' WHERE slug = 'clickone' OR name ILIKE '%clickone%';
UPDATE public.blogs SET platform_subdomain = 'trulynolen' WHERE slug = 'truly-nolen' OR name ILIKE '%truly%';
UPDATE public.blogs SET platform_subdomain = 'jp' WHERE slug ILIKE '%jp%' OR name ILIKE '%jp%bione%';
UPDATE public.blogs SET platform_subdomain = 'bione' WHERE slug = 'bione' OR name ILIKE '%bione%' AND platform_subdomain IS NULL;