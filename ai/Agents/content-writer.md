---
id: content-writer
layer: 3
type: production
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - generation-orchestrator
  - content-architect
blocks: []
tags: [content-generation, copywriting, superpage, eeat, layer-3]
---

# content-writer

> **Layer 3 — Production Agent**
> AI-driven prose generation engine. Executes section-by-section content production from the `content_blueprint`, producing publication-ready SuperPage and supporting content.

---

## Purpose

Transforms the structural blueprint into complete, E-E-A-T-aligned prose. Generates each section independently per the heading specification, respects word count targets, embeds semantic keywords naturally, and assembles the final content document for SEO validation.

---

## Responsibilities

- Generate prose for each section defined in `content_blueprint`
- Respect heading hierarchy, keyword targets, and word count targets per section
- Embed E-E-A-T signals at designated positions (author context, citations, expertise markers)
- Assemble all sections into a single structured content document
- Flag sections that could not meet quality thresholds for review
- Pass complete content document to `seo-validator`

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator | ✅ | Task parameters with blueprint attached |
| `content_blueprint` | `object` | content-architect (via orchestrator) | ✅ | Full structural specification |

### Task Input (from `task_dispatch.input`)

```json
{
  "content_blueprint": "object",
  "generation_config": {
    "model": "string",
    "tone": "authoritative | conversational | technical | educational",
    "locale": "string",
    "target_audience": "string"
  }
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `content_document` | `object` | generation-orchestrator → seo-validator | Full generated content |
| `task_result` | `object` | generation-orchestrator | Completion signal with document attached |

### `content_document` Schema

```json
{
  "job_id": "string",
  "target_url_slug": "string",
  "page_title": "string",
  "meta_description": "string",
  "sections": [
    {
      "heading_level": "string",
      "heading_text": "string",
      "content": "string (markdown)",
      "word_count": "integer",
      "keywords_used": ["string"],
      "eeat_signal_included": "string | null",
      "quality_flag": "PASS | REVIEW_REQUIRED"
    }
  ],
  "total_word_count": "integer",
  "internal_links_embedded": [
    {
      "anchor_text": "string",
      "target_slug": "string"
    }
  ],
  "eeat_elements": {
    "author_bio_included": "boolean",
    "citations_included": "boolean",
    "last_updated_included": "boolean"
  },
  "quality_summary": {
    "sections_flagged": "integer",
    "overall_status": "PASS | PARTIAL | FAIL"
  },
  "generated_at": "ISO8601"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `TASK_RECEIVED` | `task_dispatch` with blueprint arrives | Begin section-by-section generation |
| `SECTION_COMPLETE` | Each section generated | Append to document; continue to next |
| `ALL_SECTIONS_COMPLETE` | All sections generated | Assemble document; quality check; emit `task_result` |
| `SECTION_QUALITY_FAIL` | Section below word count or incoherent | Flag `REVIEW_REQUIRED`; continue pipeline |
| `GENERATION_FAILURE` | Model call fails | Retry up to 2x; if exhausted fail task |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Model API unavailable | Retry 2x with 15s backoff; fail task with `CW-002` |
| Section word count under target by >30% | Flag `REVIEW_REQUIRED`; do not block pipeline |
| E-E-A-T signal placement fails | Append E-E-A-T elements at document end; flag in `quality_summary` |
| Blueprint section count = 0 | Fail task immediately with `CW-003` |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Content documents | Supabase | `omniseen_content_documents` |

---

## Self-Registration Payload

```json
{
  "agent_id": "content-writer",
  "layer": 3,
  "type": "production",
  "version": "1.0.0",
  "capabilities": ["prose-generation", "eeat-integration", "section-assembly", "keyword-embedding", "quality-flagging"],
  "health_endpoint": "/functions/v1/content-writer/status",
  "critical": false
}
```

---

## Constraints

- Generates content strictly from the `content_blueprint` — no autonomous topic decisions.
- Must not skip sections defined in the blueprint.
- `quality_summary.overall_status: FAIL` blocks pipeline — orchestrator will not advance to `seo-validator`.
- Does not publish or deploy content.

## Error Codes

| Code | Meaning |
|---|---|
| `CW-001` | task_dispatch or blueprint schema invalid |
| `CW-002` | Model API unavailable — retries exhausted |
| `CW-003` | Blueprint contains zero sections |
| `CW-004` | Document assembly failure |
| `CW-005` | overall_status FAIL — pipeline blocked |
