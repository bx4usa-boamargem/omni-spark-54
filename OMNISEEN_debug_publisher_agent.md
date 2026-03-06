# PROMPT PARA O ANTIGRAVITY — OMNISEEN
# Problema: publisher-agent salva mas não publica
> Cole este prompt no chat do Antigravity dentro da pasta do projeto OmniSeen.

---

## CONTEXTO DO SISTEMA

Você está trabalhando no **OmniSeen** — plataforma de orquestração multi-agente para geração de conteúdo SEO.

A arquitetura opera em 3 layers:
- **Layer 1 — Infrastructure:** Supabase, Vercel, AI model APIs, SERP APIs
- **Layer 2 — Intelligence:** governor, MED, orchestrators, observability
- **Layer 3 — Production:** agents e subsystems

O pipeline de geração segue a sequência:
`research-intelligence-agent → content-architect → content-writer → seo-validator → image-strategy-agent → **publisher-agent**`

A constituição do sistema está em `ai/OMNISEEN_SYSTEM_PROMPT.md` (CANONICAL). Nenhuma sua ação pode contradizê-la.

---

## PROBLEMA REPORTADO

O `publisher-agent` está **salvando** o conteúdo no banco mas **não publicando** — o pipeline quebra neste agente sem publicar o artigo no destino final.

---

## MISSÃO

Use o agente `@systematic-debugging` combinado com `@backend-specialist` para diagnosticar e corrigir o problema.

---

## ETAPA 1 — Leitura obrigatória antes de tocar em qualquer código

Leia os seguintes arquivos na ordem:

1. `ai/OMNISEEN_SYSTEM_PROMPT.md` — confirme as responsabilidades do `publisher-agent` na Seção 6 (Responsibility Boundaries)
2. O arquivo de definição do `publisher-agent` em `.agent/agents/`
3. O código atual do `publisher-agent` no projeto
4. A Edge Function ou módulo que o `publisher-agent` chama para publicar
5. Os lifecycle events que o `publisher-agent` deve emitir: `DEPLOYMENT_STARTED`, `DEPLOYMENT_COMPLETED`, `DEPLOYMENT_FAILED`, `ROLLBACK_INITIATED`, `ROLLBACK_COMPLETED`

---

## ETAPA 2 — Diagnóstico estruturado

Responda cada item antes de escrever qualquer código:

**2.1 — Gate de pré-publicação**
- O `deployment-safety-guardian` está emitindo sinal `CLEAR`?
- O `seo-validator` passou com `PASS` ou `PASS_WITH_WARNINGS`?
- Se o gate não está sendo satisfeito, **onde exatamente está falhando silenciosamente?**

**2.2 — Lifecycle events**
- O evento `DEPLOYMENT_STARTED` está sendo emitido antes da tentativa de publicação?
- Se a publicação falha, `DEPLOYMENT_FAILED` está sendo emitido?
- `ROLLBACK_INITIATED` está sendo disparado após falha?
- Verifique a tabela de eventos (ou log) — há eventos `DEPLOYMENT_*` registrados?

**2.3 — Estado do governor**
- O `system-state-governor` está em estado `HEALTHY` no momento da tentativa de publicação?
- O `publisher-agent` está registrado no `agent_registry` do governor?
- Há algum estado `DEGRADED` ou `RECOVERY` ativo que esteja bloqueando silenciosamente?

**2.4 — Integração com Layer 1**
- A conexão com Vercel (deploy) ou o destino de publicação está configurada corretamente?
- As credenciais/tokens de deploy estão presentes nas variáveis de ambiente?
- O `publisher-agent` está tentando publicar via qual mecanismo exato? (API Vercel? Supabase Storage? Outro?)

**2.5 — Retry policy**
- Houve tentativas de retry? (max 3, backoff exponencial: 5s, 15s, 45s)
- Após 3 falhas, o sistema escalou corretamente para o governor?
- O erro está sendo **suprimido silenciosamente** em algum catch sem emitir lifecycle event? (violaria IMMUTABLE-03)

---

## ETAPA 3 — Identificar a causa raiz

Com base no diagnóstico acima, classifique o problema em uma das categorias:

```
[ ] A — Gate bloqueando (seo-validator ou deployment-safety-guardian não passou)
[ ] B — Credenciais de deploy ausentes ou inválidas (Vercel token, env vars)
[ ] C — Lifecycle event não emitido → event-logger não registra → publisher trava
[ ] D — Governor em estado não-HEALTHY bloqueando silenciosamente
[ ] E — publisher-agent não registrado no agent_registry
[ ] F — Falha na integração com destino de publicação (API externa)
[ ] G — Erro suprimido em catch (violação de IMMUTABLE-03 — sem silent failure)
```

---

## ETAPA 4 — Correção

Após identificar a causa raiz:

1. **Não altere** a sequência de layers nem a authority chain
2. **Não adicione** bypass de gate — os gates não têm override (IMMUTABLE-05)
3. Corrija **somente** o componente responsável pelo problema identificado
4. Garanta que **todos os lifecycle events** do publisher-agent sejam emitidos corretamente
5. Se o problema for em variável de ambiente, documente qual variável está faltando sem expor valores

---

## ETAPA 5 — Validação pós-correção

Após a correção, confirme:

```
[ ] publisher-agent emite DEPLOYMENT_STARTED antes de publicar
[ ] publisher-agent emite DEPLOYMENT_COMPLETED após publicação bem-sucedida
[ ] Em caso de falha, emite DEPLOYMENT_FAILED + ROLLBACK_INITIATED
[ ] O artigo aparece publicado no destino final
[ ] O event-logger registrou todos os eventos acima
[ ] O governor manteve estado HEALTHY durante todo o processo
[ ] Nenhum catch está suprimindo erros silenciosamente
```

---

## ETAPA 6 — Relatório final

Ao concluir, entregue:

```
CAUSA RAIZ IDENTIFICADA: [descrição]
CATEGORIA: [A/B/C/D/E/F/G]
ARQUIVO(S) CORRIGIDO(S): [lista]
LIFECYCLE EVENTS CONFIRMADOS: [lista]
ESTADO DO GOVERNOR: [HEALTHY/outro]
ARTIGO PUBLICADO: [SIM/NÃO — onde]
REGRAS IMUTÁVEIS RESPEITADAS: [SIM/NÃO — detalhe se NÃO]
```
