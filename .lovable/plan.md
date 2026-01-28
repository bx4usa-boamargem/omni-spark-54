
## Correção: Adicionar coluna user_id em landing_pages

### Migração SQL a executar

```sql
ALTER TABLE public.landing_pages
ADD COLUMN IF NOT EXISTS user_id uuid;

COMMENT ON COLUMN public.landing_pages.user_id IS 'ID do usuário que criou a página';
```

### Passos após aprovação

1. Executar migração SQL
2. Aguardar 5-10 segundos (schema cache)
3. Testar "Gerar Landing Page com IA"

### Resultado esperado

- Erro de schema desaparece
- Super Página é criada normalmente
- Preview abre sem problemas
