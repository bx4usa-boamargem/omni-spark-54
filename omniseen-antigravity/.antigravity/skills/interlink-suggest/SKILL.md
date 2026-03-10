---
name: interlink-suggest
description: >
  Use when you need to find and inject internal links into a piece of content.
  Activates for "add internal links to [content]", "find related pages to link from
  [article]", or "apply interlink strategy for [tenant]". Runs after section-writer
  and before seo-pack. Do not use for external link suggestions.
---

# Interlink Suggest (AG-08)

## Mission
Find the most relevant internal pages within the same tenant and inject contextual
links with natural anchors. Limits: 3–8 links per content, no link to self, no
more than 2 links to the same destination.

## Instructions

### Step 1 — Fetch Tenant Content Index
```
node scripts/fetch-content-index.js --tenant-id <id>
```
Queries Supabase for all `published` content of the tenant:
- `articles`: id, title, slug, excerpt, tags
- `landing_pages`: id, title, slug, page_type
Output: `.tmp/content-index.json`

### Step 2 — Score Relevance
```
node scripts/score-relevance.js
```
For each candidate page, calculate relevance against current content:
- Keyword overlap with draft content headings and body
- Semantic proximity (shared LSI terms from entity-map)
- Priority: super_page_local > pillar_page > blog_post

Output: Top 10 candidates with relevance score.

### Step 3 — Generate Link Suggestions via Gemini Flash
For each top candidate, suggest:
- 1–2 natural anchor texts (not "clique aqui" or naked URL)
- Best section to place the link (by H2 heading)
- Reason for the link (semantic relationship)

### Step 4 — Apply Links to Content
```
node scripts/apply-links.js --max 6
```
Rules:
- Inject 3–8 links total (soft min 3, hard max 8)
- No more than 2 links per H2 section
- No link in first paragraph (looks spammy)
- No link to current page (check by slug)
- Preserve markdown/HTML structure

### Step 5 — Output
Updates `.tmp/content-draft.json` with links injected.
Writes `.tmp/interlinks-applied.json` with audit trail:
```json
{
  "links_applied": 5,
  "links": [
    { "anchor": "...", "url": "...", "section": "H2 #3", "reason": "..." }
  ]
}
```

## Constraints
- Never link to external sites
- Never use keyword-stuffed anchors
- If tenant has < 3 published pages: skip and log "Insufficient content for interlinking"
