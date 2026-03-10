---
name: entity-mapper
description: >
  Use when you need to extract semantic entities, related terms, and intent
  signals from SERP data or raw text. Activates for tasks like "map entities
  for [keyword]", "extract semantic context from search results", or "identify
  LSI terms for [topic]". Do not use without SERP data as input — always runs
  after serp-scout.
---

# Entity Mapper (AG-02)

## Mission
Transform raw SERP snippets into a structured semantic map: entities, LSI terms,
intent classification, and content format signals. Feeds directly into outline-builder.

## Instructions

### Step 1 — Load SERP Input
Read `.tmp/serp-scout-output.json` (produced by serp-scout skill).
If file missing, abort with error: "Run serp-scout first."

### Step 2 — Extract Entities via AI
Call Gemini Flash with the SERP snippets and extract:
- Named entities (brands, places, people, services)
- LSI/related terms (semantic variants)
- Intent signals: informational | commercial | local | transactional
- Content format patterns: FAQ, listicle, how-to, comparison, local-service

Use the extraction prompt from `scripts/entity-prompt.txt`.

Run:
```
node scripts/extract-entities.js
```
This reads `.tmp/serp-scout-output.json`, calls Gemini Flash, writes `.tmp/entities.json`.

### Step 3 — Score Strategic Value
For each entity cluster, assign a strategic_value score (0–100) based on:
- Search intent alignment with tenant's business type
- Commercial signal density
- Local signal presence (city/region mentions)

### Step 4 — Output Structure
```json
{
  "primary_keyword": "...",
  "intent": "local | commercial | informational | transactional",
  "entities": [{ "text": "...", "type": "brand|place|service|concept" }],
  "lsi_terms": ["..."],
  "format_signals": ["faq", "how-to"],
  "strategic_value": 85,
  "cluster_label": "..."
}
```

## Constraints
- Never invent entities not present in source SERP data
- Always classify intent as one of the 4 allowed types
- strategic_value must be 0–100 integer
- Output to `.tmp/entity-map.json`
