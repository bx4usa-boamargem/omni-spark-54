---
name: section-writer
description: >
  Use when you need to write individual content sections for a blog post or super
  page based on an outline. Activates for tasks like "write sections for [article]",
  "generate content from outline", or "write H2 sections for [topic]". Always runs
  after outline-builder. Writes one section at a time in a loop to maintain
  consistency and avoid context drift.
---

# Section Writer (AG-07)

## Mission
Write each H2 section individually, following the blueprint objectives, injecting
local signals when applicable, and enforcing anti-hallucination rules per section.
Quality Gate (AG-11) will validate the full result — this skill focuses on faithful
execution of the outline.

## Instructions

### Step 1 — Load Blueprint
Read `.tmp/outline.json`. This is your strict contract — do not deviate from it.
Also load:
- `.tmp/entity-map.json` for LSI terms and local signals
- `business_inputs` from context (company, service, city, phone)
- `web_research_enabled` flag

### Step 2 — Write Sections in Loop
For each section in `outline.sections`, run sequentially:
```
node scripts/write-section.js --index <N>
```

Each section write:
1. Sends ONLY the current section's `heading`, `objective`, `key_points`, and word count target
2. Injects: primary keyword, LSI terms, local city/service signals
3. Applies retry_warnings from previous quality gate failures (if any in context)
4. Writes output to `.tmp/sections/section-<N>.json`

### Step 3 — Inject Local Signals
For sections in super pages or local-intent articles:
- City/region MUST appear in first H2 and in conclusion
- Service name in 60–80% of H2 headings (natural, not forced)
- Phone number in Hero and CTA sections only
- Address only if provided in `business_inputs`

### Step 4 — Anti-Hallucination Enforcement
Before writing each section, check:
- If `web_research_enabled = false`: flag any statistical claim with `[CLAIM_UNVERIFIED]`
- Never write: prices, specific certifications, years in business, review counts
  unless these are in `business_inputs`
- Replace unverifiable claims with hedged language:
  - "anos no mercado" → "atuando na região"
  - "certificado por X" → "profissionais qualificados"
  - "R$ X" → "solicite um orçamento"

### Step 5 — Assemble Full Content
After all sections written:
```
node scripts/assemble-content.js
```
Merges all section JSONs into `.tmp/content-draft.json` with:
- `content_json` (block structure)
- `content_html` (rendered HTML)
- `word_count_actual`
- `local_signals_injected` (count)
- `claims_flagged` (array)

## Constraints
- One Gemini call per section — never write full article in single call
- If section word count exceeds target by > 30%, trim and log warning
- claims_flagged must be resolved by quality-gate before publishing
- Output: `.tmp/content-draft.json`
