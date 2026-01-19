-- Expand territories table with Google Maps fields
ALTER TABLE territories
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS radius_km INT DEFAULT 15,
ADD COLUMN IF NOT EXISTS neighborhood_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS official_name TEXT;

-- Indices for geographic search
CREATE INDEX IF NOT EXISTS idx_territories_place_id ON territories(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_territories_location ON territories(lat, lng) WHERE lat IS NOT NULL;