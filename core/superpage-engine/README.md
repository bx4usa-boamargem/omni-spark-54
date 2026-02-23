# Superpage Engine

Clean, parallel engine for **Super Pages** (3000–6000 words) and **Articles** (1500–3000 words). No dependencies on legacy `orchestrate-generation` or existing Edge Functions.

## Architecture

- **Ports** (`ports/`): Interfaces for SERP, LLM, image generation, SEO score, storage. The engine never imports concrete implementations.
- **Pipeline** (`pipeline/`): Sequential steps: SERP → Outline → Entities → Content → Images → SEO Score → Save → Publish.
- **Types** (`types.ts`): Domain types only; no I/O.
- **Config** (`config.ts`): Word counts and options per `content_type` (`super_page` | `article`).

Adapters (implementations of ports) live **outside** this folder—e.g. in `supabase/functions/` or a separate `adapters/` package—so the engine stays testable and swappable.

## Pipeline steps

| Step            | Depends on | Port    | Purpose |
|-----------------|------------|---------|---------|
| SERP_ANALYSIS   | —          | serp    | Analyze SERP for keyword/locale |
| OUTLINE_GEN     | SERP       | llm     | H1, H2[], H3[] outline |
| ENTITIES        | SERP, Outline | llm  | Extract semantic entities |
| CONTENT_GEN     | SERP, Outline, Entities | llm | HTML + FAQ + meta (word count by config) |
| IMAGES_GEN      | Content    | imageGen | Hero + section images (Gemini Nano Banana, etc.) |
| SEO_SCORE       | Content    | seoScore | Score + suggestions |
| SAVE            | Content, Images | storage | Persist article (draft) |
| PUBLISH         | Save       | storage | Set status to published (if config.publishAfterSave) |

## Usage

```ts
import { runSuperPagePipeline, getConfig } from './core/superpage-engine';
import { createPorts } from '../adapters/superpage-ports'; // your adapters

const input = {
  keyword: 'dedetização São Paulo',
  blogId: '...',
  contentType: 'super_page',
  locale: { language: 'pt-BR', city: 'São Paulo' },
  niche: 'pragas',
};

const ports = createPorts(supabaseClient, env);
const result = await runSuperPagePipeline(input, ports, jobId);

if (result.success && result.context?.article) {
  console.log('Article created:', result.context.article.id);
} else {
  console.error('Failed at', result.failedStep, result.error);
}
```

## Config

- **super_page**: 3000–6000 words, section images on, max 8, SEO score on.
- **article**: 1500–3000 words, section images on, max 5, SEO score on.

Override with `getConfig(contentType, overrides)`.

## Adding adapters

Implement the interfaces in `ports/index.ts`:

- **SerpPort**: `analyze(keyword, locale)` → `SerpAnalysisResult`
- **LlmPort**: `generateOutline`, `extractEntities`, `generateContent`
- **ImageGenPort**: `generateHero`, `generateSection`, or `generateAll(slots)`
- **SeoScorePort**: `score(content, serp?)` → `SeoScoreResult`
- **StoragePort**: `saveArticle(params)`, `publishArticle(articleId)`

Example: a Supabase storage adapter would use `supabase.from('articles').insert(...)` and `supabase.storage.from('article-images').upload(...)` without touching any legacy Edge Function code.

## File layout

```
core/superpage-engine/
├── index.ts          # Public API: runSuperPagePipeline
├── types.ts          # Domain types
├── config.ts         # PipelineConfig per content type
├── ports/
│   └── index.ts      # SerpPort, LlmPort, ImageGenPort, SeoScorePort, StoragePort
├── pipeline/
│   ├── runner.ts     # runPipeline(ctx, ports)
│   └── steps/
│       ├── index.ts
│       ├── serp-analysis.ts
│       ├── outline.ts
│       ├── entities.ts
│       ├── content.ts
│       ├── images.ts
│       ├── seo-score.ts
│       ├── save.ts
│       └── publish.ts
└── README.md
```

## Integration with legacy

To trigger this engine from the app:

1. Add a new Edge Function (e.g. `create-superpage-job`) that inserts a row in a **new** table or a dedicated `job_type` and then invokes a **new** orchestrator that uses `runSuperPagePipeline` with adapters that call your existing Supabase/APIs. Do **not** modify `create-generation-job` or `orchestrate-generation`.
2. Or call `runSuperPagePipeline` from a backend service (Node/Deno) that has the same adapters.

This keeps the legacy engine untouched and allows parallel rollout of the new engine.
