-- Adicionar controle de assinatura do agente na brand_agent_config
ALTER TABLE brand_agent_config
ADD COLUMN IF NOT EXISTS agent_subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS agent_subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agent_stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS monthly_price_usd DECIMAL(10,2) DEFAULT 47.00;

-- Constraint para status válidos
DO $$ BEGIN
  ALTER TABLE brand_agent_config
  ADD CONSTRAINT brand_agent_subscription_status_check 
  CHECK (agent_subscription_status IN ('inactive', 'active', 'trial', 'canceled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índice para consultas de agentes ativos
CREATE INDEX IF NOT EXISTS idx_brand_agent_active 
ON brand_agent_config(agent_subscription_status) 
WHERE agent_subscription_status = 'active';

-- Criar tabela de histórico de uso mensal do agente
CREATE TABLE IF NOT EXISTS brand_agent_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_leads_captured INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blog_id, month)
);

-- Habilitar RLS na nova tabela
ALTER TABLE brand_agent_usage_monthly ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem visualizar
CREATE POLICY "Admins can view agent usage"
ON brand_agent_usage_monthly
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'platform_admin')
  )
);

-- Política: Apenas admins podem inserir/atualizar
CREATE POLICY "Admins can manage agent usage"
ON brand_agent_usage_monthly
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'platform_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'platform_admin')
  )
);