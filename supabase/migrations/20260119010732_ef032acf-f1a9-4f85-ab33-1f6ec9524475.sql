-- Create real_leads table for tracking actual lead initiations
CREATE TABLE public.real_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('whatsapp_click', 'form_submit', 'phone_click', 'email_click')),
  source_url TEXT,
  visitor_id TEXT,
  session_id TEXT,
  contact_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_real_leads_blog_id ON real_leads(blog_id);
CREATE INDEX idx_real_leads_created_at ON real_leads(created_at);
CREATE INDEX idx_real_leads_blog_created ON real_leads(blog_id, created_at DESC);

-- Enable RLS
ALTER TABLE real_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Blog owners can view their leads
CREATE POLICY "Blog owners can view real_leads"
  ON real_leads FOR SELECT
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));

-- Policy: Team members can view leads
CREATE POLICY "Team members can view real_leads"
  ON real_leads FOR SELECT
  USING (
    blog_id IN (
      SELECT blog_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Policy: Admins can view all leads
CREATE POLICY "Admins can view all real_leads"
  ON real_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

-- Policy: Allow anonymous insert for tracking (visitors are not authenticated)
CREATE POLICY "Allow insert for tracking"
  ON real_leads FOR INSERT
  WITH CHECK (true);