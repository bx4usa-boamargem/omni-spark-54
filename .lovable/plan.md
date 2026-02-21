
# Engine V2 — Ultra Fast SEO Mode

## Overview
Replace the current 10-step orchestrator pipeline (SERP, NLP, TITLE, OUTLINE, CONTENT, IMAGE, SEO, META, OUTPUT) with a streamlined 5-step pipeline that generates a complete article in a single LLM call, reducing generation time from 4-6 minutes to 30-60 seconds.

## What Changes

### 1. Rewrite `orchestrate-generation/index.ts` (complete rewrite)

The new pipeline has only 5 steps:

```text
INPUT_VALIDATION --> SERP_SUMMARY --> ARTICLE_GEN_SINGLE_PASS --> SAVE_ARTICLE --> IMAGE_GEN_ASYNC
```

**Step details:**

- **INPUT_VALIDATION** (programmatic, 0 API calls) — Same as current, validates keyword/blog_id/niche
- **SERP_SUMMARY** (1 API call, optional) — Lightweight SERP summary using Gemini 2.5 Flash with a short prompt; produces a brief competitive landscape summary (not the heavy 10-result analysis). If it fails, pipeline continues with empty context.
- **ARTICLE_GEN_SINGLE_PASS** (1 API call, core step) — Single Gemini 2.5 Flash call that generates title, meta_description, html_article, FAQ, and image_prompt all at once in strict JSON format. 6000 max tokens, temperature 0.4.
- **SAVE_ARTICLE** (programmatic, 0 API calls) — Parses JSON output, validates HTML, inserts article into `articles` table, updates `generation_jobs` with article_id.
- **IMAGE_GEN_ASYNC** (1 API call, non-blocking) — Uses the `image_prompt` from the article output to call `google/gemini-2.5-flash-image` via Lovable AI Gateway. Updates article's `featured_image_url` after generation. Falls back to picsum if image generation fails. Article is already saved at this point.

### 2. Update `ai-router/index.ts`

Add new task type `article_gen_single_pass` to the MODEL_ROUTING table with appropriate settings (Gemini 2.5 Flash, temp 0.4, maxTokens 6000).

### 3. Update Frontend — `GenerationDetail.tsx`

Update the client pipeline stages to reflect the simpler V2 flow:

- ANALYZING_MARKET (INPUT_VALIDATION + SERP_SUMMARY)  
- WRITING_CONTENT (ARTICLE_GEN_SINGLE_PASS)
- FINALIZING (SAVE_ARTICLE + IMAGE_GEN_ASYNC)

Reduce from 4 client stages to 3. Update `STEP_LABELS` and `ORDERED_STEPS` for admin view.

### 4. Update `PUBLIC_STAGE_MAP` in orchestrator

Map the 5 new steps to 3 client-facing stages with appropriate progress percentages.

## Technical Details

### New Orchestrator Flow

1. Load job, acquire lock, start heartbeat/watchdog (same as V1)
2. INPUT_VALIDATION: validate inputs (programmatic)
3. SERP_SUMMARY: single short LLM call for competitive context (non-fatal if fails)
4. ARTICLE_GEN_SINGLE_PASS: single LLM call with the full prompt returning JSON with title, meta, html_article, faq, image_prompt
5. SAVE_ARTICLE: parse JSON, validate HTML has h1/style/content, insert into articles table
6. IMAGE_GEN_ASYNC: call gemini-2.5-flash-image with the image_prompt, update featured_image_url
7. Mark job completed, release lock

### Removed Components

- All multi-step functions: `executeSerpAnalysis`, `executeNlpKeywords`, `executeTitleGen`, `executeOutlineGen`, `generateBatch`, `runCritic`, `rewriteSection`, `executeSeoScore`, `executeMetaGen`
- Budget reservation system (only 2-3 API calls total)
- Content critic loop
- Batch content generation
- NLP tracker
- Circuit breaker fallbacks (simplified error handling)
- Complex SEO refinement loop

### Kept Components

- Lock/heartbeat/watchdog mechanism (reliability)
- Public stage mapping (frontend compatibility)
- JSON parser with fallback extraction
- HTML validation (relaxed)
- 3x article insert retry
- Fatal crash guard

### Image Generation

- Uses `image_prompt` field from the LLM response (contextual, not generic)
- Calls `google/gemini-2.5-flash-image` via Lovable AI Gateway directly (not through ai-router)
- Extracts base64 image from response, uploads to `article-images` storage bucket
- Updates article `featured_image_url` with public storage URL
- Fallback: picsum.photos if image generation fails

### Constants Changes

- `MAX_API_CALLS`: 15 down to 5
- `MAX_JOB_TIME_MS`: 360s down to 120s
- `LOCK_TTL_MS`: 300s down to 120s
- Pipeline steps: 10 down to 5

### No Database Schema Changes Required

The existing `articles` and `generation_jobs` tables already have all necessary columns. The `generation_steps` table will simply have fewer rows per job.
