
# Correcao Completa: 5 Bugs Criticos no Motor de Geracao

## Resumo dos Problemas Encontrados

Apos analise profunda do codigo, identifiquei 5 bugs interconectados que causam os sintomas relatados.

---

## Bug 1: Progresso Travado em "Classificando intencao..." (28%)

**Causa Raiz**: O `generate-article-structured/index.ts` NAO atualiza `generation_stage` e `generation_progress` no banco durante o processamento. Ele so atualiza UMA VEZ, no final (`completed`, 100%). Portanto, o polling no frontend nunca ve mudancas intermediarias.

**Correcao**: Adicionar atualizacoes de `generation_stage` e `generation_progress` em cada etapa do pipeline dentro de `generate-article-structured/index.ts`:

| Etapa do Pipeline | Stage | Progress |
|-------------------|-------|----------|
| Inicio | validating | 5 |
| Classificacao de intencao | classifying | 15 |
| Pesquisa (Perplexity) | researching | 30 |
| Escrita (Writer AI) | writing | 55 |
| Quality Gate (QA) | seo | 75 |
| Geracao de imagens | images | 88 |
| Persistencia | finalizing | 95 |
| Completo | completed | 100 |

Cada etapa fara um `UPDATE articles SET generation_stage = X, generation_progress = Y WHERE id = Z`.

**Pre-requisito**: O `generate-article-structured` precisa receber o `article_id` do placeholder para poder atualizar o registro correto. Atualmente, ele cria um NOVO registro via `persistArticleToDb`. O fluxo do `ArticleGenerator.tsx` ja cria um placeholder, mas o `convert-opportunity-to-article` nao.

**Arquivo**: `supabase/functions/generate-article-structured/index.ts`

---

## Bug 2: Artigo Duplicado (1 Rascunho + 1 Publicado)

**Causa Raiz**: Dois problemas combinados:

1. **`auto_publish` ignorado**: No `generate-article-structured/index.ts` (linha 2486), o codigo faz `const autoPublish = !shouldForceDraft;`, que IGNORA completamente o parametro `auto_publish: false` enviado pelo `convert-opportunity-to-article`. Se o Quality Gate passar, o artigo e auto-publicado mesmo quando o caller pediu draft.

2. **Dois registros criados**: O `ArticleGenerator.tsx` cria um placeholder com status `generating`, e depois o `generate-article-structured` cria OUTRO registro via `persistArticleToDb`. Isso gera 2 artigos: o placeholder (que fica em `generating/draft`) e o novo (que fica em `published`).

**Correcao**:
- No `generate-article-structured/index.ts`, respeitar o parametro `auto_publish` do request:
  ```
  const autoPublish = auto_publish && !shouldForceDraft;
  ```
- Para o fluxo de oportunidades, nao duplicar: como o `convert-opportunity-to-article` nao cria placeholder, o fluxo atual (criar novo) esta correto, mas o `auto_publish: false` precisa ser respeitado.
- Para o fluxo do `ArticleGenerator.tsx`, enviar o `article_id` do placeholder para que `generate-article-structured` atualize o registro existente em vez de criar um novo.

**Arquivos**: `supabase/functions/generate-article-structured/index.ts`

---

## Bug 3: Imagem de Capa Repetida no Corpo do Artigo

**Causa Raiz**: Em 3 locais diferentes do codigo, a `featured_image_url` e definida como `image_prompts[0].url` (primeira imagem do corpo). Isso faz com que a mesma imagem apareca como capa E como primeira imagem interna:

- `geminiImageGenerator.ts` linha 158
- `aiProviders.ts` linha 833
- `generate-article-structured/index.ts` linha 2417

**Correcao**: A imagem de capa deve ser EXCLUSIVA. Ao definir `featured_image_url = image_prompts[0].url`, remover essa imagem da lista `content_images` (ou gerar uma imagem extra especifica para a capa). A abordagem mais simples e: ao persistir, excluir o primeiro item de `content_images` quando ele for identico a `featured_image_url`.

**Arquivos**: `supabase/functions/generate-article-structured/index.ts` (na funcao `persistArticleToDb`)

---

## Bug 4: Mesma Estrutura Para Todas as Subcontas

**Causa Raiz**: O template e HARDCODED como `'complete_guide'` no `generate-article-structured/index.ts` (linha 1667):

```typescript
template: 'complete_guide' as TemplateType,
variant: 'chronological' as import(...).TemplateVariant,
```

Isso ignora completamente:
- O `article_structure_type` enviado pelo `convert-opportunity-to-article` (que usa rotacao)
- O `editorial_model` enviado (traditional/strategic/visual_guided)

Alem disso, o `article_structure_type` salvo no banco e sempre `'complete_guide'`, que nao e reconhecido pelo sistema de rotacao editorial (`editorialRotation.ts` procura por `traditional`, `strategic`, `visual_guided`). Entao a rotacao nunca funciona corretamente.

**Correcao**: 
1. No `generate-article-structured`, usar os parametros `article_structure_type` e `editorial_model` recebidos do request em vez de hardcodar `complete_guide`
2. Salvar o `editorial_model` (nao o template) como `article_structure_type` para que a rotacao funcione
3. Usar as instrucoes do `EDITORIAL_MODEL_INSTRUCTIONS` (que ja existem no codigo, linhas 903-933) de acordo com o modelo selecionado

**Arquivos**: `supabase/functions/generate-article-structured/index.ts`

---

## Bug 5: `convert-opportunity-to-article` Espera a Resposta Inteira (Lento)

**Causa Raiz**: O `convert-opportunity-to-article` faz `await fetch(generate-article-structured)` e espera a resposta completa (inclui pesquisa + escrita + QA + imagens). Depois, APOS receber a resposta, ainda gera 3 imagens adicionais (cover + problem + solution). Isso pode facilmente ultrapassar o timeout de 150s da Edge Function.

O frontend ja implementou o padrao correto com polling, mas o backend precisa atualizar os stages no banco para que o polling funcione.

**Correcao**: No `convert-opportunity-to-article`, criar o placeholder ANTES de chamar `generate-article-structured` e enviar o `article_id` para que o backend atualize os stages. Remover a geracao extra de imagens (linhas 529-585) pois o `generate-article-structured` ja gera imagens internamente.

**Arquivo**: `supabase/functions/convert-opportunity-to-article/index.ts`

---

## Plano de Implementacao

### Fase 1: Corrigir `generate-article-structured/index.ts`

1. Aceitar `article_id` opcional no request (para atualizar placeholder em vez de criar novo registro)
2. Adicionar funcao `updateStage(articleId, stage, progress)` que faz UPDATE no banco
3. Chamar `updateStage` antes de cada etapa do pipeline (classifying, researching, writing, seo, images, finalizing)
4. Respeitar `auto_publish` do request: `const autoPublish = auto_publish && !shouldForceDraft`
5. Usar `editorial_model` e `article_structure_type` do request em vez de hardcodar `complete_guide`
6. Na persistencia, quando `article_id` fornecido, fazer UPDATE no placeholder em vez de INSERT novo
7. Na persistencia, excluir da `content_images` a imagem que e identica a `featured_image_url`

### Fase 2: Corrigir `convert-opportunity-to-article/index.ts`

1. Criar placeholder no banco ANTES de chamar `generate-article-structured` (status: generating, generation_stage: validating)
2. Enviar `article_id` do placeholder para `generate-article-structured`
3. Remover geracao extra de imagens (linhas 529-585) — redundante com o pipeline interno

### Fase 3: Deploy e Teste

1. Deploy das duas Edge Functions
2. Testar geracao via oportunidade: verificar que progresso avanca em tempo real
3. Verificar que nao ha duplicidade (apenas 1 artigo criado)
4. Verificar que imagem de capa nao aparece no corpo
5. Verificar que artigos alternam entre modelos editoriais

---

## Arquivos Modificados

| Arquivo | Mudancas |
|---------|----------|
| `supabase/functions/generate-article-structured/index.ts` | Stages no banco, respeitar auto_publish, usar editorial_model, aceitar article_id, deduplicar capa |
| `supabase/functions/convert-opportunity-to-article/index.ts` | Criar placeholder, enviar article_id, remover imagens extras |

## Resultado Esperado

- Progresso avanca em tempo real (6 fases visiveis no frontend)
- Apenas 1 artigo criado por geracao (sem duplicidade)
- Imagem de capa exclusiva (nao repetida no corpo)
- Modelos editoriais alternam entre traditional, strategic e visual_guided
- Tempo de resposta da Edge Function reduzido (sem imagens extras redundantes)
