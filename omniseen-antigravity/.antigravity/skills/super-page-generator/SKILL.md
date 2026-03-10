---
name: super-page-generator
description: >
  Use when you need to generate a complete local service Super Page from a template.
  Activates for "create super page for [service] in [city]", "generate local page
  from template [name]", or "build service page for [company]". Orchestrates the
  full pipeline: template load → context assembly → research → blocks → SEO →
  validation. Do not use for blog posts — use section-writer pipeline instead.
---

# Super Page Generator

## Mission
Execute a local service Super Page from template to published page with minimal
inputs (company, service, city, phone). The template defines the blocks — this
skill fills them with real, grounded content. Zero hallucinations tolerated.

## Instructions

### Step 1 — Load Template
```
node scripts/load-template.js --template-id <id>
```
Reads `super_page_templates` from Supabase.
Extracts:
- `default_blocks_json`: required block order (Hero, Services, FAQ, CTA, etc.)
- `required_inputs_json`: what the user must provide
- `default_seo_json`: pre-configured SEO presets for this industry

### Step 2 — Validate Inputs
Check `business_inputs` against `required_inputs_json`.
Required minimum: `company_name`, `service`, `city`, `phone`.
If any missing: abort with specific message "Missing required input: [field]".
Optional: `address`, `neighborhoods_served`, `sub_services`, `differentials`.

### Step 3 — Context Assembly
Combine:
- Template defaults
- Business inputs
- Radar item data (if `radar_item_id` provided): keyword, angle, strategic context
- Tenant profile from Supabase (language, country, brand)

Build `page_context` object used in all downstream scripts.

### Step 4 — Research (if web_research_enabled)
Activate serp-scout skill for: `{service} {city}`
Extract:
- Competitor block structures
- Local FAQs from PAA
- Common service categories for this vertical

### Step 5 — Generate Blocks
For each block in `default_blocks_json`, run:
```
node scripts/generate-block.js --block-type <type>
```

Block types and rules:
- **hero**: H1 = "{service} em {city}" + subtitle + phone CTA
- **services**: 3–6 sub-services inferred from entity-map or research. If none: use generic industry services
- **areas_served**: neighborhoods from business_inputs or generic city areas — never invent specific addresses
- **differentials**: ONLY use differentials from business_inputs. If empty: generic ("equipe especializada", "atendimento rápido")
- **faq**: min 3 Q&As. Questions from PAA or entity-map. Answers must not include prices
- **cta_final**: phone + optional WhatsApp link
- **map**: render only if `address` provided

### Step 6 — SEO + Schema
Activate seo-pack skill with `content_type = super_page_local`.

### Step 7 — Quality Gate
Activate quality-gate skill.
If score < 70: retry blocks with retry_warnings, max 1 retry.
If score < 50 after retry: save as draft, flag for human review.

### Step 8 — Save to Supabase
```
node scripts/save-super-page.js --publish-mode <draft|scheduled|published>
```
Writes to `landing_pages` table (current schema) and creates version record.

## Constraints
- NEVER invent: prices, specific certifications, review counts, years in business
- NEVER use real competitor names in content
- If research unavailable: use template defaults, not invented content
- Always save version on publish
