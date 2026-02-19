
-- Phase 4: Add engine_version, parent_job_id, needs_review, published columns to generation_jobs
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT 'v1';
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES generation_jobs(id);
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS published_url TEXT;
