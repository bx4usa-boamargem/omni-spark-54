-- ═══════════════════════════════════════════════════════════════════════════
-- OMNISEEN — Social Media OAuth Credentials
-- Migration: 20260310_create_social_credentials
-- ═══════════════════════════════════════════════════════════════════════════

-- Main credentials table (one row per blog/subconta)
CREATE TABLE IF NOT EXISTS social_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id         UUID NOT NULL UNIQUE REFERENCES blogs(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Instagram / Facebook ─────────────────────────────────────────────
  instagram_access_token          TEXT,
  instagram_business_account_id   TEXT,
  instagram_account_name          TEXT,
  instagram_expires_at            TIMESTAMPTZ,
  facebook_access_token           TEXT,
  facebook_page_id                TEXT,
  facebook_page_name              TEXT,

  -- ── LinkedIn ─────────────────────────────────────────────────────────
  linkedin_access_token     TEXT,
  linkedin_refresh_token    TEXT,
  linkedin_account_id       TEXT,
  linkedin_account_name     TEXT,
  linkedin_organization_id  TEXT,
  linkedin_org_name         TEXT,
  linkedin_expires_at       TIMESTAMPTZ,

  -- ── Google Business Profile ───────────────────────────────────────────
  google_access_token           TEXT,
  google_refresh_token          TEXT,
  google_account_name           TEXT,
  google_business_account_id    TEXT,
  google_business_location_id   TEXT,
  google_expires_at             TIMESTAMPTZ
);

-- Row Level Security
ALTER TABLE social_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: user can only access credentials for blogs they own
CREATE POLICY "owner_social_credentials" ON social_credentials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blogs WHERE blogs.id = social_credentials.blog_id AND blogs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blogs WHERE blogs.id = social_credentials.blog_id AND blogs.user_id = auth.uid()
    )
  );

-- Deny direct token column reads via client API (tokens only accessible via Edge Functions)
-- Row-level grants client SELECT but withholds sensitive columns
REVOKE SELECT ON social_credentials FROM anon, authenticated;

GRANT SELECT (
  id, blog_id, created_at, updated_at,
  instagram_account_name, instagram_business_account_id, instagram_expires_at,
  facebook_page_name, facebook_page_id,
  linkedin_account_name, linkedin_account_id, linkedin_organization_id, linkedin_org_name, linkedin_expires_at,
  google_account_name, google_business_account_id, google_business_location_id, google_expires_at
) ON social_credentials TO authenticated;

-- Full access for service role (used by Edge Functions)
GRANT ALL ON social_credentials TO service_role;

-- Timestamp auto-update trigger
CREATE OR REPLACE FUNCTION update_social_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_social_credentials_updated_at
  BEFORE UPDATE ON social_credentials
  FOR EACH ROW EXECUTE FUNCTION update_social_credentials_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_credentials_blog_id ON social_credentials(blog_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Social Posts — log of publicated posts
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS social_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id         UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  article_id      UUID REFERENCES articles(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'google_business', 'facebook')),
  content         TEXT NOT NULL,
  media_url       TEXT,
  external_post_id TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'scheduled')),
  error_message   TEXT,
  published_at    TIMESTAMPTZ,
  scheduled_for   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_social_posts" ON social_posts
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM blogs WHERE blogs.id = social_posts.blog_id AND blogs.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM blogs WHERE blogs.id = social_posts.blog_id AND blogs.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_social_posts_blog_id ON social_posts(blog_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_article_id ON social_posts(article_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
