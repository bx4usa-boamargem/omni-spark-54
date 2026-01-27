-- Adicionar colunas de SEO snapshot para landing_pages
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS seo_score INTEGER,
ADD COLUMN IF NOT EXISTS seo_metrics JSONB,
ADD COLUMN IF NOT EXISTS seo_recommendations JSONB,
ADD COLUMN IF NOT EXISTS seo_analyzed_at TIMESTAMPTZ;

-- Índice para ordenação por score
CREATE INDEX IF NOT EXISTS idx_landing_pages_seo_score 
ON landing_pages(seo_score DESC NULLS LAST);

-- Índice para filtro por status
CREATE INDEX IF NOT EXISTS idx_landing_pages_status 
ON landing_pages(status);

-- Comentários para documentação
COMMENT ON COLUMN landing_pages.seo_score IS 'SEO score 0-100 calculado na última análise';
COMMENT ON COLUMN landing_pages.seo_metrics IS 'Breakdown detalhado do score SEO (title_points, meta_points, etc)';
COMMENT ON COLUMN landing_pages.seo_recommendations IS 'Lista de recomendações para melhorar o SEO';
COMMENT ON COLUMN landing_pages.seo_analyzed_at IS 'Timestamp da última análise SEO';