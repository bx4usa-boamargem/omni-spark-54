-- Tabela de configuração global de comunicação (conta-mãe OmniSeen)
CREATE TABLE public.global_comm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  whatsapp_base_url TEXT NOT NULL DEFAULT 'https://wa.me/{phone}?text={message}',
  message_template TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '["phone", "service", "city", "article_title", "company_name"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão da OmniSeen (conta-mãe)
INSERT INTO public.global_comm_config (config_key, whatsapp_base_url, message_template, placeholders) 
VALUES (
  'whatsapp_default',
  'https://wa.me/{phone}?text={message}',
  'Olá! Vi o artigo "{article_title}" no blog e gostaria de saber mais sobre {service} em {city}. Podem me ajudar?',
  '["phone", "service", "city", "article_title", "company_name"]'::jsonb
);

-- Enable RLS
ALTER TABLE public.global_comm_config ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler a configuração global
CREATE POLICY "Anyone can read global comm config" 
  ON public.global_comm_config 
  FOR SELECT 
  USING (true);

-- Política: Apenas platform_admin pode modificar
CREATE POLICY "Only platform admin can modify global comm config" 
  ON public.global_comm_config 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('platform_admin', 'admin')
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_global_comm_config_updated_at
  BEFORE UPDATE ON public.global_comm_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca rápida
CREATE INDEX idx_global_comm_config_key ON public.global_comm_config(config_key) WHERE is_active = true;