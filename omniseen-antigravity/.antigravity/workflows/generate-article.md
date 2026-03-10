---
name: generate-article
description: End-to-end blog article generation for OmniSeen. Runs the full pipeline from SERP research to published content.
command: generate-article
---

# Generate Article Workflow

## Trigger
`/generate-article`

## Steps

1. **Collect Inputs**
   Ask user for:
   - `tenant_id` (or pick from context)
   - `keyword` OR `radar_item_id`
   - `web_research_enabled` (yes/no, default: yes)
   - `publish_mode` (draft | scheduled | published)

2. **Run Pipeline**
   Activate `content-orchestrator` agent with collected inputs.
   The agent will execute:
   - serp-scout → entity-mapper → outline-builder
   - section-writer (loop per H2)
   - interlink-suggest → seo-pack → quality-gate

3. **Report Results**
   Show artifact:
   - Title, slug, word count
   - Quality score (with breakdown)
   - Links injected count
   - Publish status
   - Link to view in Admin: `https://app.omniseen.app/client/articles`

4. **On Failure**
   Show which step failed, specific error, and what the user needs to provide.
