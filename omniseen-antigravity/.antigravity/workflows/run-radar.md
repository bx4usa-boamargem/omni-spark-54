---
name: run-radar
description: Generate content opportunity backlog (Radar) for a tenant from a seed topic.
command: run-radar
---

# Run Radar Workflow

## Trigger
`/run-radar`

## Steps

1. **Collect Inputs**
   - `tenant_id`
   - `seed_topic` (e.g., "dedetização", "reforma de telhado")
   - `market` (pt-BR, en-US)
   - `web_research_enabled` (default: yes)

2. **Run Radar Planner**
   Activate `content-orchestrator` agent → `radar-planner` skill.

3. **Report Results**
   Artifact:
   - Total items generated
   - Local items (→ super_page)
   - Blog items
   - Top 5 items by strategic_value (title, score, next_step)
   - Admin link: `https://app.omniseen.app/client/radar`
