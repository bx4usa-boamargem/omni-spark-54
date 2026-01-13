-- Add source_payload column to store origin metadata from Radar/Ideas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS source_payload jsonb;

COMMENT ON COLUMN articles.source_payload IS 
'JSON with origin metadata: angle, why_now, sources, original keywords';