# Workflow: Debug de Edge Function

## Comando: /debug-edge-fn

Diagnostica e corrige problemas em Supabase Edge Functions.

## Checklist de diagnóstico (rodar em ordem)

### 1. Verificar logs locais
```bash
supabase functions serve {nome} --env-file .env.local --debug
```

### 2. Testar request básico
```bash
curl -X POST http://localhost:54321/functions/v1/{nome} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {anon_key}" \
  -d '{"tenant_id": "test-uuid"}'
```

### 3. Problemas comuns e soluções

| Erro | Causa provável | Solução |
|------|----------------|---------|
| `Cannot find module` | Import Node.js | Trocar por import Deno/ESM |
| `process is not defined` | `process.env` usado | Trocar por `Deno.env.get()` |
| `RLS violation` | Query sem filtro tenant_id | Adicionar `.eq('tenant_id', tenantId)` |
| `JWT expired` | Token de auth expirado | Usar service_role key no server |
| `CORS error` | Headers ausentes | Adicionar corsHeaders ao response |
| `Kill-switch triggered` | Custo IA excedido | Verificar `ai_cost_limits` no Supabase |
| `Timeout` | Step de IA muito lento | Quebrar em jobs menores, usar Flash |

### 4. Verificar variáveis de ambiente
```bash
# Listar secrets configurados
supabase secrets list

# Setar secret ausente
supabase secrets set NOME_DA_VAR=valor
```

### 5. Verificar RLS no Supabase Studio
```sql
-- Testar policy manualmente
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid"}';
SELECT * FROM sua_tabela WHERE tenant_id = 'tenant-uuid';
```

### 6. Verificar job_events para auditoria de pipeline
```sql
SELECT * FROM job_events
WHERE job_id = '{job-id}'
ORDER BY created_at ASC;
```

### 7. Verificar ai_run_steps para auditoria de IA
```sql
SELECT step_key, status, tokens_in, tokens_out, created_at
FROM ai_run_steps
WHERE ai_run_id = '{run-id}'
ORDER BY created_at ASC;
```

## Padrão de erro esperado

Edge Functions devem sempre retornar:
```json
// Sucesso
{ "ok": true, "data": {...} }

// Erro
{ "error": "mensagem legível" }
// com status HTTP 400, 401, 403, 404, 500
```

## Deploy em produção

```bash
# Deploy de uma função
supabase functions deploy {nome}

# Deploy de todas as funções
supabase functions deploy

# Verificar status
supabase functions list
```
