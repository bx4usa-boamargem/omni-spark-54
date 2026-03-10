# ⚠️ LEGACY V1/V2 — NÃO USAR PARA NOVAS FEATURES

Esta edge function pertence ao pipeline de geração **V1/V2** (legacy).

## Por que está aqui?

- Ainda é invocada por `ClientArticleEditor.tsx` (via `fromOpportunity` param)
- Ainda é invocada por `autoCreateArticle.ts` (`startFromOpportunity`)
- Mantida para não quebrar fluxos existentes

## Pipeline Atual (V3 / Ativo)

O pipeline V3 correto é:
```
Radar V3 → createArticleFromOpportunity.ts → create-generation-job → orchestrate-generation
```

O arquivo `src/lib/createArticleFromOpportunity.ts` já usa `create-generation-job`
e suporta `source: 'radar_v3'` (aponta para `radar_v3_opportunities`).

## STATUS

- **NÃO DELETAR** — em uso por fluxo legado
- **NÃO CRIAR** novas chamadas para esta função
- **MIGRAR** callers para `create-generation-job` direto quando possível

## Callers atuais

| Arquivo | Linha | Observação |
|---|---|---|
| `src/pages/client/ClientArticleEditor.tsx` | ~318 | `handleConvertOpportunity` via `fromOpportunity` URL param |
| `src/lib/autoCreateArticle.ts` | ~43 | `startFromOpportunity` |
| `src/components/content/FunnelModal.tsx` | ~140 | Ramo V1 do modal de funil |
