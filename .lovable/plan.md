

# RELATORIO COMPLETO + PLANO DE CORRECAO DO FLUXO DE GERACAO

## RELATORIO EVIDENCIADO

### 1. Fluxo Atual (Front -> Backend -> DB -> UI)

**Front** (`GenerationNew.tsx` L86-105): Envia payload para `create-generation-job` com `blog_id`, `keyword`, `city`, `niche`, etc. Navega para `/client/articles/engine/{job_id}`.

**create-generation-job** (`index.ts` L124-146): Cria registro em `generation_jobs` com `status: 'pending'`, depois invoca `orchestrate-generation` fire-and-forget.

**orchestrate-generation** (`index.ts` L555-863): Pipeline de 5 etapas: INPUT_VALIDATION -> SERP_SUMMARY -> ARTICLE_GEN_SINGLE_PASS -> SAVE_ARTICLE -> IMAGE_GEN_ASYNC -> COMPLETED. Atualiza `public_stage`, `public_progress`, `public_message` em cada etapa.

**GenerationDetail.tsx** (L207-258): Carrega job e steps, assina Realtime em `generation_jobs` e `generation_steps`.

---

### 2. PROBLEMA 1: Progress Nao Evolui em Tempo Real

**Causa Raiz**: A tabela `generation_steps` NAO esta na publicacao `supabase_realtime`.

**Evidencia** (query real):
```
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
=> [generation_jobs]   -- SOMENTE generation_jobs, SEM generation_steps
```

A UI admin assina `generation_steps` (L250-253), mas os eventos nunca chegam. A UI client usa `public_stage`/`public_progress` de `generation_jobs` que esta no Realtime e FUNCIONA, mas a barra de progresso client tem auto-advance lento (0.5% por segundo, L304-310) que nao reflete o progresso real rapido do backend (~30s total).

**Impacto**: Admin ve "0/5 steps" congelado. Client ve progresso artificialmente lento.

---

### 3. PROBLEMA 2: Nao Redireciona Apos Conclusao

**Causa Raiz**: NAO EXISTE `useEffect` de auto-redirect no componente `GenerationDetail.tsx`.

**Evidencia**: O arquivo inteiro (567 linhas) nao contem nenhum `useEffect` que verifique `job.status === 'completed'` para navegar. Quando o job termina, o usuario ve os botoes "Ver Artigo" e "Editar" (L431-434 para client, L548-551 para admin), mas precisa clicar manualmente.

---

### 4. PROBLEMA 3: Slug Duplicado Causa "Pipeline completed but no article was saved"

**Evidencia** (dados reais dos 2 jobs mais recentes):
```
job ea5cc57e: keyword="5 Maneiras de Incluir Lacos...", status=failed, error="Pipeline completed but no article was saved."
job 30a16391: keyword="5 Maneiras de Incluir Lacos...", status=failed, error="Pipeline completed but no article was saved."
```

Ambos geraram conteudo com sucesso (5/5 steps completed), mas o SAVE_ARTICLE falhou porque ja existia um artigo com o mesmo slug `5-maneiras-de-incluir-lacos-no-seu-guarda-roupa-com-confianca-e-proposito` para o mesmo `blog_id`. O slug e gerado de forma deterministica (L347-351 do orchestrator) sem sufixo unico, e a constraint `(blog_id, slug)` bloqueia a insercao.

Porem, o step `SAVE_ARTICLE` esta marcado como `completed` no `generation_steps`, mas `article_id` fica `null` no `generation_jobs`. O pipeline final (L810-811) detecta `!article_id && !fallbackHtml` e lanca erro.

---

### 5. PROBLEMA 4: So Gera Imagem de Capa (Hero)

**Evidencia**: O `executeImageGenAsync` (L438-549) gera APENAS 1 imagem: o hero/cover. O prompt da IA retorna apenas 1 `image_prompt` (string unica, nao array). O orchestrator nao solicita prompts para imagens inline.

**O que falta**: O prompt do `ARTICLE_GEN_SINGLE_PASS` (L286-301) pede apenas:
```
"image_prompt": "... detailed realistic description ..."
```
Deveria pedir um array de image_prompts (hero + inline). Alem disso, nao ha logica para gerar multiplas imagens nem para inserir placeholders no HTML.

---

### 6. PROBLEMA 5: CTA Nao Injetado

**Evidencia** (artigos gerados):
```
article 1a937ea0: cta = null
article 2c43b791: cta = null
```

**Causa**: O `executeSaveArticle` (L362-370) tenta construir CTA a partir de `jobInput.whatsapp` e `jobInput.business_name`, mas esses campos vem do formulario `GenerationNew.tsx` sob `payload.business` (L101-103), que so e preenchido se o usuario preencher `form.business_name`. Como o usuario nao preencheu, `whatsapp` e `undefined`.

O sistema NAO carrega o CTA configurado no blog (`blogs.cta_type`, `blogs.cta_url`, `blogs.cta_text`, `blogs.header_cta_url`). O orchestrator nunca faz SELECT na tabela `blogs` para buscar a config de CTA da subconta.

Alem disso, mesmo quando `cta` e construido e salvo no campo JSON, ele NAO e injetado no HTML do artigo. O HTML sai da IA sem bloco CTA padrao.

---

## PLANO DE CORRECOES (PATCHES EXATOS)

### PATCH I: Habilitar Realtime para generation_steps (Migration)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_steps;
```

### PATCH II: Auto-redirect no GenerationDetail.tsx

Adicionar `useEffect` apos L314 (apos o bloco de perceived progress):

```typescript
// Auto-redirect to editor when job completes
useEffect(() => {
  if (!job) return;
  if (job.status === 'completed' && job.article_id) {
    const timer = setTimeout(() => {
      navigate(`/client/articles/${job.article_id}/edit`, { replace: true });
    }, 2500); // 2.5s para o usuario ver "Artigo pronto!"
    return () => clearTimeout(timer);
  }
}, [job?.status, job?.article_id, navigate]);
```

Adicionar estado visual de "redirecionando" na secao client (antes dos botoes, L430):

```typescript
{job.status === 'completed' && job.article_id && (
  <div className="border rounded-lg p-4 bg-green-500/10 border-green-500/30 text-center space-y-2">
    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
    <p className="text-sm font-medium text-green-700">Artigo pronto! Redirecionando para o editor...</p>
    <Loader2 className="w-4 h-4 animate-spin mx-auto text-green-600" />
  </div>
)}
```

Mesma logica para admin view (antes dos botoes, L547).

### PATCH III: Corrigir Slug Duplicado (orchestrate-generation)

No `executeSaveArticle`, L347-351, alterar a geracao do slug:

```typescript
// ANTES:
const slug = title.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .substring(0, 80);

// DEPOIS:
const baseSlug = title.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .substring(0, 70);
const slug = `${baseSlug}-${Date.now().toString(36)}`;
```

### PATCH IV: Corrigir Label "API Calls 0/15" (GenerationDetail.tsx L481)

```typescript
// ANTES:
<p className="font-bold">{job.total_api_calls || 0}/15</p>

// DEPOIS:
<p className="font-bold">{job.total_api_calls || 0}/5</p>
```

### PATCH V: Carregar CTA do Blog no Orchestrator

No `executeSaveArticle` (orchestrate-generation/index.ts), antes de construir o CTA (L362), adicionar busca ao blog:

```typescript
// Buscar config CTA do blog
const { data: blogData } = await supabase
  .from('blogs')
  .select('cta_type, cta_url, cta_text, header_cta_text, header_cta_url, city')
  .eq('id', blogId)
  .single();

// Construir CTA: priorizar dados do job, fallback para config do blog
const whatsapp = (jobInput.whatsapp as string) || '';
const businessName = (jobInput.business_name as string) || '';
const city = (jobInput.city as string) || blogData?.city || '';

let cta: Record<string, unknown> | null = null;
if (whatsapp) {
  cta = { type: 'whatsapp', value: whatsapp, label: businessName ? `Fale com ${businessName}` : 'Fale conosco pelo WhatsApp', city };
} else if (blogData?.cta_url || blogData?.header_cta_url) {
  cta = {
    type: blogData.cta_type || 'link',
    value: blogData.cta_url || blogData.header_cta_url,
    label: blogData.cta_text || blogData.header_cta_text || 'Saiba mais',
    city,
  };
}
```

### PATCH VI: Injetar CTA no HTML do Artigo

Apos salvar o artigo com CTA no campo JSON, injetar um bloco HTML antes do fechamento do body. Adicionar funcao `injectCtaIntoHtml`:

```typescript
function injectCtaIntoHtml(html: string, cta: Record<string, unknown> | null): string {
  if (!cta || !cta.value) return html;
  
  const ctaUrl = cta.type === 'whatsapp' 
    ? `https://wa.me/${(cta.value as string).replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Vi seu artigo e gostaria de saber mais.')}`
    : cta.value as string;
  
  const ctaBlock = `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center;">
  <h3 style="color: white; font-size: 1.4em; margin-bottom: 12px;">Gostou do conteudo?</h3>
  <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">${cta.label || 'Entre em contato'}</p>
  <a href="${ctaUrl}" target="_blank" rel="noopener" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1em;">
    ${cta.type === 'whatsapp' ? '💬 Falar no WhatsApp' : cta.label || 'Saiba mais'}
  </a>
</div>`;

  // Inserir antes do ultimo </div> ou </body> ou ao final
  if (html.includes('</body>')) {
    return html.replace('</body>', ctaBlock + '</body>');
  }
  return html + ctaBlock;
}
```

Chamar antes do insert: `const finalHtml = injectCtaIntoHtml(htmlArticle, cta);` e usar `finalHtml` no `insertPayload.content`.

### PATCH VII: Imagens Inline (Fase Futura - Simplificado)

A geracao de imagens inline requer mudancas significativas no prompt da IA (pedir array de image_prompts), geracao de N imagens (custo e tempo), e insercao de placeholders no HTML. Como correcao imediata, recomendo:

1. Alterar o prompt `ARTICLE_GEN_SINGLE_PASS` para solicitar 3 image_prompts no JSON:
```json
"image_prompts": [
  {"context": "hero", "prompt": "..."},
  {"context": "section_1", "prompt": "...", "after_section": 1},
  {"context": "section_2", "prompt": "...", "after_section": 3}
]
```

2. Gerar as imagens em loop no step `IMAGE_GEN_ASYNC` (atual gera apenas 1).

3. Inserir as URLs no HTML substituindo placeholders ou apos os H2 correspondentes.

**Nota**: Esta mudanca aumenta o custo (~3x mais chamadas de imagem) e o tempo (~+30s). Pode ser implementada como fase separada apos estabilizar o fluxo basico.

---

## ARQUIVOS A ALTERAR

| Arquivo | Mudanca |
|---------|---------|
| Nova migration SQL | Adicionar `generation_steps` ao Realtime |
| `src/pages/client/GenerationDetail.tsx` | Auto-redirect + UI completion state + fix /15->/5 |
| `supabase/functions/orchestrate-generation/index.ts` | Slug unico + Carregar CTA do blog + Injetar CTA no HTML |

---

## CRITERIOS DE ACEITE

1. **Progress Real-time**: Ao gerar artigo, as etapas do pipeline atualizam em tempo real na UI (admin ve 5 steps, client ve 3 stages).
2. **Auto-redirect**: Ao completar, usuario e redirecionado automaticamente para `/client/articles/{id}/edit` em 2.5 segundos.
3. **Slug Unico**: Gerar o mesmo keyword multiplas vezes NAO causa erro "Pipeline completed but no article was saved".
4. **CTA Presente**: O HTML do artigo salvo contem bloco CTA com link da subconta (WhatsApp ou URL configurada no blog).
5. **Imagem Hero**: Imagem de capa continua sendo gerada (hero). Imagens inline ficam para fase posterior.

