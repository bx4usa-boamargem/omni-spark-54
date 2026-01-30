-- Add columns for image tracking with retries and incremental updates
-- Also add generation_stage for real-time stage polling

ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS images_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_stage TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS generation_progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta JSONB DEFAULT NULL;

COMMENT ON COLUMN articles.images_total IS 'Total number of images to generate';
COMMENT ON COLUMN articles.images_completed IS 'Number of images successfully generated';
COMMENT ON COLUMN articles.generation_stage IS 'Current generation stage for real-time UI polling';
COMMENT ON COLUMN articles.generation_progress IS 'Current progress percentage (0-100)';
COMMENT ON COLUMN articles.cta IS 'Call-to-action data from business profile (whatsapp, phone, booking_url, etc)';