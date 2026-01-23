-- Phase 1: Evolve niche_profiles schema for Deterministic Architecture

-- Add new governance columns to niche_profiles
ALTER TABLE niche_profiles 
ADD COLUMN IF NOT EXISTS required_terms TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS image_style TEXT DEFAULT 'documentary';

-- Add check constraints for valid values
ALTER TABLE niche_profiles 
DROP CONSTRAINT IF EXISTS niche_profiles_tone_check;
ALTER TABLE niche_profiles 
ADD CONSTRAINT niche_profiles_tone_check 
CHECK (tone IN ('technical', 'commercial', 'educational', 'professional'));

ALTER TABLE niche_profiles 
DROP CONSTRAINT IF EXISTS niche_profiles_image_style_check;
ALTER TABLE niche_profiles 
ADD CONSTRAINT niche_profiles_image_style_check 
CHECK (image_style IN ('realistic', 'editorial', 'documentary', 'commercial'));

-- Create score_change_log table for audit trail
CREATE TABLE IF NOT EXISTS score_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  old_score NUMERIC(5,2),
  new_score NUMERIC(5,2) NOT NULL,
  change_reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('user', 'system', 'auto-fix', 'boost', 'recalculate')),
  content_version INTEGER,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on score_change_log
ALTER TABLE score_change_log ENABLE ROW LEVEL SECURITY;

-- Create policies for score_change_log using team_members (correct table)
CREATE POLICY "Users can view score changes for their blog articles"
ON score_change_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM articles a
    JOIN blogs b ON a.blog_id = b.id
    LEFT JOIN team_members tm ON b.id = tm.blog_id AND tm.user_id = auth.uid() AND tm.status = 'accepted'
    WHERE a.id = score_change_log.article_id
    AND (b.user_id = auth.uid() OR tm.id IS NOT NULL)
  )
);

CREATE POLICY "Service role can insert score changes"
ON score_change_log FOR INSERT
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_score_change_log_article_id ON score_change_log(article_id);
CREATE INDEX IF NOT EXISTS idx_score_change_log_created_at ON score_change_log(created_at DESC);

-- Update niche_profiles with sensible defaults for existing rows
UPDATE niche_profiles SET 
  required_terms = CASE 
    WHEN name ILIKE '%pest%' OR name ILIKE '%praga%' THEN ARRAY['dedetização', 'controle de pragas', 'proteção']
    WHEN name ILIKE '%law%' OR name ILIKE '%advog%' OR name ILIKE '%jurid%' THEN ARRAY['direito', 'legislação', 'assessoria jurídica']
    WHEN name ILIKE '%health%' OR name ILIKE '%saúde%' OR name ILIKE '%med%' THEN ARRAY['saúde', 'tratamento', 'bem-estar']
    WHEN name ILIKE '%roof%' OR name ILIKE '%telha%' THEN ARRAY['telhado', 'cobertura', 'impermeabilização']
    WHEN name ILIKE '%plumb%' OR name ILIKE '%hidra%' THEN ARRAY['encanamento', 'hidráulica', 'vazamento']
    ELSE ARRAY[]::TEXT[]
  END,
  tone = COALESCE(tone, 'professional'),
  image_style = COALESCE(image_style, 'documentary')
WHERE required_terms IS NULL OR required_terms = ARRAY[]::TEXT[];