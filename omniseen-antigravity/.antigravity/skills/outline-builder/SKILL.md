---
name: outline-builder
description: >
  Use when you need to generate a structured content outline (H1/H2/H3 hierarchy)
  for a blog post or super page. Activates for tasks like "create outline for
  [topic]", "build content blueprint for [article]", or "generate article structure
  from radar item". Always runs after entity-mapper. Do not use for short-form
  content or single sections.
---

# Outline Builder (AG-05)

## Mission
Generate a SERP-fit content blueprint with H2/H3 hierarchy, word count targets,
and section objectives. Each section must have a clear purpose and avoid content
already covered by competitors (gap-first approach).

## Instructions

### Step 1 — Load Inputs
Required files:
- `.tmp/entity-map.json` (from entity-mapper)
- `.tmp/serp-scout-output.json` (from serp-scout)

Also load from agent context:
- `business_inputs` (company name, service, city)
- `content_type`: `blog_post` | `super_page_local`
- `target_word_count` (default: 1500 for blog, 1200 for super page)

### Step 2 — Analyze Competitor Gaps
Run:
```
node scripts/analyze-gaps.js
```
Reads SERP top 5 structure, identifies:
- Topics covered by most competitors (avoid or go deeper)
- Topics missing from all competitors (gap opportunity)
- FAQs in PAA not answered well

### Step 3 — Generate Outline via Gemini Pro
Call Gemini Pro with structured schema response:
```
node scripts/generate-outline.js --type <blog_post|super_page_local>
```

For `blog_post`:
- H1 (target keyword + angle)
- Intro section (hook + context)
- 4–8 H2 sections with 1–3 H3 each
- FAQ section (3–5 questions from PAA)
- Conclusion + CTA

For `super_page_local`:
- H1 (service + city)
- Hero section (CTA + phone)
- Services list (sub-services)
- Áreas atendidas (city/regions)
- Diferenciais (no invented certifications)
- FAQ local
- CTA final

### Step 4 — Output Blueprint
```json
{
  "h1": "...",
  "target_word_count": 1500,
  "sections": [
    {
      "heading": "H2 text",
      "level": 2,
      "objective": "What this section accomplishes",
      "word_count_target": 300,
      "key_points": ["point 1", "point 2"],
      "subsections": []
    }
  ],
  "faq": [{ "question": "...", "answer_directive": "..." }],
  "internal_link_slots": 4
}
```

## Constraints
- Never invent section content — only define structure and objectives
- FAQ questions MUST come from PAA or entity-map data
- For super_page_local: never include "years in business" or "certifications" without business_inputs data
- Output to `.tmp/outline.json`
