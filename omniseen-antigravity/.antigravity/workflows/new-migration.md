# Workflow: Nova Migration Supabase

## Comando: /new-migration

Cria uma migration SQL para Supabase seguindo os padrões OmniSeen.

## Inputs necessários

1. **Descrição curta** (ex: `add_super_page_templates`)
2. **Tabelas a criar ou alterar**
3. **Campos necessários** com tipos
4. **RLS necessário** (quem pode ler/escrever)

## Template de Migration

```sql
-- supabase/migrations/{timestamp}_{descricao}.sql

-- =============================================
-- {DESCRIÇÃO DA MIGRATION}
-- =============================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS public.{nome_tabela} (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- campos específicos aqui
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices obrigatórios
CREATE INDEX IF NOT EXISTS idx_{nome_tabela}_tenant_id
  ON public.{nome_tabela}(tenant_id);

-- Índice de status (se aplicável)
CREATE INDEX IF NOT EXISTS idx_{nome_tabela}_status
  ON public.{nome_tabela}(status) WHERE status != 'done';

-- RLS
ALTER TABLE public.{nome_tabela} ENABLE ROW LEVEL SECURITY;

-- Policy: tenant member pode ler/escrever os próprios dados
CREATE POLICY "{nome_tabela}_tenant_member" ON public.{nome_tabela}
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = {nome_tabela}.tenant_id
        AND tm.user_id = auth.uid()
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_{nome_tabela}_updated_at
  BEFORE UPDATE ON public.{nome_tabela}
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## Padrões obrigatórios

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- RLS **sempre habilitado** — nunca `USING (true)`
- Policy sempre filtra por `tenant_id` via `tenant_members`
- Índice em `tenant_id` sempre presente
- Índice em `status` para tabelas de fila/jobs (filtrado por status ativo)

## Tabelas de catálogo global (sem tenant_id)

Apenas para dados compartilhados entre todos os tenants (ex: `super_page_templates`):
```sql
-- RLS com SELECT público (somente leitura)
CREATE POLICY "templates_public_read" ON public.super_page_templates
  FOR SELECT USING (true);

-- NUNCA permitir INSERT/UPDATE via cliente — apenas service role
```

## Checklist final

- [ ] Timestamp no nome do arquivo (`YYYYMMDDHHMMSS_descricao.sql`)
- [ ] `tenant_id` com FK e CASCADE
- [ ] RLS habilitado
- [ ] Policy baseada em `tenant_members` (não `USING (true)`)
- [ ] Índice em `tenant_id`
- [ ] Trigger `updated_at` se tabela tem `updated_at`
- [ ] Testar com `supabase db reset` localmente
