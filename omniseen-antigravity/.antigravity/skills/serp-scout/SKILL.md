---
name: serp-scout
description: >
  Use when you need to research SERP results, Google Places data, or competitive
  landscape for a keyword or local business query. Activates for tasks like
  "analyze competitors for [keyword]", "find top pages ranking for [term]",
  or "research local businesses in [city]". Do not use for content writing or SEO
  optimization — only for raw research and data gathering.
---

# SERP Scout (AG-01)

## Mission
Gather raw SERP intelligence and local business data to inform content strategy.
This skill calls Google Custom Search JSON API and Places API, caches results in
Supabase to avoid redundant API calls, and returns structured data for downstream
agents.

## Instructions

### Step 1 — Check Cache First
Before calling any API, run the cache check script:
```
node scripts/check-cache.js <query> <locale>
```
If cache hit (< 24h old), return cached data immediately. Skip to Step 4.

### Step 2 — SERP Research
Run the SERP fetch script with the target keyword and locale:
```
node scripts/fetch-serp.js "<keyword>" "<locale>"
```
- `locale` format: `pt-BR`, `en-US`
- Returns: top 10 URLs, titles, snippets, PAA questions, related searches
- Output file: `.tmp/serp-result.json`

### Step 3 — Places Research (only for local intent queries)
If the keyword contains city/service signals (e.g., "dedetização SP", "telhado reforma BH"):
```
node scripts/fetch-places.js "<service>" "<city>"
```
- Returns: nearby businesses, ratings, types, formatted address
- Output file: `.tmp/places-result.json`

### Step 4 — Structure Output
Combine results into a single JSON object:
```json
{
  "keyword": "...",
  "locale": "...",
  "serp": { "urls": [], "paa": [], "related": [] },
  "places": { "businesses": [], "top_categories": [] },
  "cached": false,
  "timestamp": "..."
}
```

## Constraints
- Never call SERP API more than once per keyword+locale per 24 hours (use cache)
- Never call Places API more than once per service+city per 30 days
- If `GOOGLE_CSE_KEY` is missing, log warning and skip SERP — do not fail
- Maximum 10 SERP results per query

## Output
Saves structured JSON to `.tmp/serp-scout-output.json`
Prints summary: keyword, result count, cache status, PAA count
