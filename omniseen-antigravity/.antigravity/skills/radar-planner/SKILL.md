---
name: radar-planner
description: >
  Use when you need to generate or refresh the content opportunity backlog (Radar)
  for a tenant. Activates for "run radar for [topic]", "generate content backlog
  for [tenant]", or "find content opportunities for [service/industry]". Produces
  radar_items with strategic_value scores, recommended asset types, and next steps.
  Do not use for single keyword research — use serp-scout for that.
---

# Radar Intelligence Planner (AG-06)

## Mission
Build an actionable content backlog from scratch: cluster keywords by intent,
score by strategic value, recommend asset type (blog vs super_page), and map
each item to a template when local intent detected. Output is ready for the
automation planner to consume.

## Instructions

### Step 1 — Initialize Radar Run
```
node scripts/init-radar-run.js --tenant-id <id> --seed-topic "<topic>" --market <pt-BR|en-US>
```
Creates record in `radar_runs` (status: running).

### Step 2 — Keyword Expansion
```
node scripts/expand-keywords.js --seed "<topic>" --market <market>
```
Uses Google Custom Search + Related Searches to generate 20–50 keyword variants.
Groups by:
- Informational: "como fazer X", "o que é X"
- Commercial: "melhor X", "X preço"
- Local: "X em [city]", "X [neighborhood]"
- Transactional: "contratar X", "X orçamento"

### Step 3 — SERP Scout per Cluster
For each cluster (max 10 clusters per radar run):
Activate serp-scout skill for the cluster's representative keyword.
Cache aggressively — same keyword+locale valid for 24h.

### Step 4 — Entity Mapping per Cluster
Activate entity-mapper for each cluster.
Compute `strategic_value` per cluster:
- Local intent: base 70 + places_density + local_signal_count
- Commercial: base 60 + serp_difficulty_proxy (inverse)
- Informational: base 40 + gap_score

### Step 5 — Template Matching (for local intent clusters)
```
node scripts/match-template.js
```
For each local cluster, find best matching `super_page_template` from Supabase:
- Match by `industry` and `page_type`
- Set `recommended_template_id` if match found

### Step 6 — Respect mix_policy
Read `automation_schedules.mix_policy` for this tenant:
- `{ blog: 0.7, super_page: 0.3 }` → ensure final backlog reflects this ratio
- Override if tenant has 0 super_pages (prioritize super_page for first 5 items)

### Step 7 — Save Radar Items
```
node scripts/save-radar-items.js
```
For each cluster, save to `article_opportunities` (current schema):
- title, slug suggestion, relevance_score (= strategic_value), status: backlog
- recommended_asset_type, recommended_template_id, cluster_label, angle, next_step

Update radar_run status to `done`.

### Output Summary
Print: tenant, seed_topic, clusters_found, items_saved, local_items, blog_items

## Constraints
- Max 50 radar items per run
- strategic_value must be integer 0–100
- next_step must be one of: "generate_blog" | "generate_super_page" | "manual_review"
- Never create duplicate items (check by slug uniqueness per tenant)
