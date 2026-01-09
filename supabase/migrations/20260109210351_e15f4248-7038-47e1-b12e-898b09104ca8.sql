-- 1. Tabela de notificações de automação unificada
CREATE TABLE IF NOT EXISTS automation_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'article_generated', 'images_generated', 'article_published', 'automation_scheduled', 'automation_failed', 'article_renewed'
  title TEXT NOT NULL,
  message TEXT,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX idx_automation_notifications_user_blog ON automation_notifications(user_id, blog_id);
CREATE INDEX idx_automation_notifications_created ON automation_notifications(created_at DESC);
CREATE INDEX idx_automation_notifications_unread ON automation_notifications(user_id, blog_id) WHERE read_at IS NULL;

-- 3. RLS Policies
ALTER TABLE automation_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation notifications"
  ON automation_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own automation notifications"  
  ON automation_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON automation_notifications FOR INSERT
  WITH CHECK (true);

-- 4. Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE automation_notifications;