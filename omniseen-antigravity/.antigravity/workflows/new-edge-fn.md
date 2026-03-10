# Workflow: Nova Edge Function

## Comando: /new-edge-fn

Cria uma nova Supabase Edge Function seguindo os padrões do projeto OmniSeen.

## Inputs necessários

Antes de começar, perguntar:
1. **Nome da função** (ex: `generate-blog`, `radar-run`)
2. **Propósito** em uma linha
3. **Inputs esperados** (campos do body JSON)
4. **Output esperado** (campos do response JSON)
5. **Agents/skills que vai invocar** (se souber)

## Steps do Workflow

### Step 1 — Criar estrutura
```
supabase/functions/{nome}/index.ts
```

### Step 2 — Implementar o template padrão

- CORS headers
- `serve()` com try/catch
- Validação de `tenant_id` no body
- Autenticação com `SUPABASE_SERVICE_ROLE_KEY`
- Invocação do agent correspondente
- Response tipada

### Step 3 — Criar/atualizar tipos em `types/agents.ts`

Adicionar interfaces de input/output da nova função se não existirem.

### Step 4 — Registrar job_events

Se a função executa um pipeline longo:
- Criar registro em `jobs` com status `running`
- Emitir `job_events` em cada step
- Atualizar `jobs.status` para `done` ou `failed` ao final

### Step 5 — Criar migration se necessário

Se a função precisa de novas tabelas ou colunas:
- Criar `supabase/migrations/{timestamp}_{desc}.sql`
- Incluir `tenant_id`, `created_at`, índices, RLS

### Step 6 — Testar no terminal

```bash
supabase functions serve {nome} --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/{nome} \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "test-uuid", ...}'
```

## Checklist final

- [ ] Import de Deno/ESM (não Node)
- [ ] `tenant_id` validado
- [ ] CORS headers presentes
- [ ] Erros retornam `{ error: string }` com status correto
- [ ] `callGeminiTracked()` usado (nunca chamada direta à IA)
- [ ] `job_events` emitidos se pipeline longo
- [ ] Tipos adicionados em `types/agents.ts`
- [ ] Variáveis de ambiente documentadas no `.env.example`
