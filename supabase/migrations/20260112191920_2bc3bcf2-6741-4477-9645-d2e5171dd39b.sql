-- Add banner overlay opacity column to blogs table
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS banner_overlay_opacity INTEGER DEFAULT 50;

-- Add comment for documentation
COMMENT ON COLUMN public.blogs.banner_overlay_opacity IS 'Banner overlay opacity percentage (30-80)';