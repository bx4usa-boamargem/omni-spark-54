---
id: content-architect
layer: 3
type: production
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - generation-orchestrator
  - research-intelligence-agent
blocks: []
tags: [architecture, superpage, topical-authority, content-structure, layer-3]
---

# content-architect

> **Layer 3 — Production Agent**
> Topical authority structure designer. Consumes the research brief and produces a complete SuperPage blueprint and supporting content cluster map for `content-writer`.

---

## Purpose

Transforms raw research intelligence into a structured content architecture. Defines the SuperPage outline, internal linking strategy, heading hierarchy, E-E-A-T signal placement, and the supporting content cluster required to establish topical authority.

---

## Responsibilities

- Design the SuperPage structure from the research brief
- Define H1–H4 heading hierarchy and section scope
- Map internal linking opportunities within the content cluster
- Specify E-E-A-T signal placement (author bio, citations, expertise markers)
- Define supporting content pieces required for topical completeness
- Produce a content blueprint consumed by `content-writer`

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator | ✅ | Task parameters including research_brief |
| `research_brief` | `object` | research-intelligence-agent (via orchestrator) | ✅ | Full research output |

### Task Input (from `task_dispatch.input`)

```json
{
  "research_brief": "object",
  "job_type": "SUPERPAGE | SUPPORTING_CONTENT | CLUSTER",
  "target_url_slug": "string",
  "config": {
    "locale": "string",
    "content_depth": "SHALLOW | STANDARD | DEEP"
  }
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `content_blueprint` | `object` | generation-orchestrator → content-writer | Full structural spec |
| `task_result` | `object` | generation-orchestrator | Task completion with blueprint attached |

### `content_blueprint` Schema

```json
{
  "job_id": "string",
  "job_type": "SUPERPAGE | SUPPORTING_CONTENT | CLUSTER",
  "target_url_slug": "string",
  "primary_keyword": "string",
  "page_title": "string",
  "meta_description_guidance": "string",
  "heading_structure": [
    {
      "level": "H1 | H2 | H3 | H4",
      "text": "string",
      "section_purpose": "string",
      "target_keywords": ["string"],
      "eeat_signal": "string | null",
      "word_count_target": "integer"
    }
  ],
  "internal_links": [
    {
      "anchor_text": "string",
      "target_slug": "string",
      "placement_section": "string"
    }
  ],
  "eeat_requirements": {
    "author_bio_required": "boolean",
    "citations_required": "boolean",
    "expert_quotes_required": "boolean",
    "last_updated_signal": "boolean"
  },
  "supporting_content_cluster": [
    {
      "title": "string",
      "slug": "string",
      "purpose": "string",
      "target_keyword": "string"
    }
  ],
  "total_word_count_target": "integer",
  "generated_at": "ISO8601"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `TASK_RECEIVED` | `task_dispatch` with research_brief arrives | Begin blueprint design |
| `BLUEPRINT_COMPLETE` | All sections defined | Emit `task_result` with blueprint |
| `RESEARCH_BRIEF_INVALID` | Brief missing required fields | Fail task with `CA-002` |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| research_brief incomplete | Generate best-effort blueprint; flag `low_confidence: true` |
| Heading structure exceeds depth for `SHALLOW` | Cap at H1 + 3x H2; omit H3/H4 |
| No internal link targets available | Emit empty `internal_links: []`; continue |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Content blueprints | Supabase | `omniseen_content_blueprints` |

---

## Self-Registration Payload

```json
{
  "agent_id": "content-architect",
  "layer": 3,
  "type": "production",
  "version": "1.0.0",
  "capabilities": ["superpage-design", "heading-hierarchy", "eeat-mapping", "cluster-architecture", "internal-link-strategy"],
  "health_endpoint": "/functions/v1/content-architect/status",
  "critical": false
}
```

---

## Constraints

- Receives only from `generation-orchestrator` — no direct input from research agent.
- Does not write prose — structural specification only.
- Must validate `research_brief` schema before blueprint generation begins.

## Error Codes

| Code | Meaning |
|---|---|
| `CA-001` | task_dispatch schema invalid |
| `CA-002` | research_brief missing required fields |
| `CA-003` | Blueprint generation failed |
| `CA-004` | Supabase persistence failure |
