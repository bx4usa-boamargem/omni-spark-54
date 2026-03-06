---
id: image-strategy-agent
layer: 3
type: production
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - generation-orchestrator
  - seo-validator
blocks: []
tags: [images, visual-strategy, alt-text, seo, assets, layer-3]
---

# image-strategy-agent

> **Layer 3 — Production Agent**
> Visual asset strategy and specification engine. Defines image requirements, generates alt text, and produces image placement directives for the validated content document.

---

## Purpose

Determines where visual assets should appear, what they should depict, and how they should be optimized for SEO and accessibility. Does not generate or fetch images — produces the image strategy consumed by `publisher-agent` during deployment.

---

## Responsibilities

- Analyze validated content document for image placement opportunities
- Define image type, dimensions, and purpose per placement
- Generate SEO-optimized alt text per image
- Produce image file naming conventions per SEO best practices
- Specify featured image requirements for the SuperPage
- Output a structured image strategy document

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator | ✅ | Task parameters |
| `validated_content_document` | `object` | seo-validator (via orchestrator) | ✅ | Validated content with section structure |

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `image_strategy` | `object` | generation-orchestrator → publisher-agent | Full visual asset specification |
| `task_result` | `object` | generation-orchestrator | Completion signal |

### `image_strategy` Schema

```json
{
  "job_id": "string",
  "featured_image": {
    "purpose": "string",
    "dimensions": "string",
    "alt_text": "string",
    "file_name": "string",
    "seo_title": "string"
  },
  "inline_images": [
    {
      "placement_after_section": "string",
      "image_type": "DIAGRAM | PHOTO | INFOGRAPHIC | SCREENSHOT | CHART",
      "purpose": "string",
      "dimensions": "string",
      "alt_text": "string",
      "file_name": "string",
      "caption": "string | null",
      "priority": "REQUIRED | OPTIONAL"
    }
  ],
  "total_images_required": "integer",
  "total_images_optional": "integer",
  "generated_at": "ISO8601"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `TASK_RECEIVED` | `task_dispatch` with validated document arrives | Analyze sections; define image placements |
| `STRATEGY_COMPLETE` | All placements defined | Emit `task_result` with image_strategy |
| `DOCUMENT_INVALID` | validated_content_document schema fails | Fail task with `ISA-001` |

---

## Image Placement Rules

| Condition | Rule |
|---|---|
| SuperPage with `content_depth: DEEP` | Minimum 1 image per 2 H2 sections |
| SuperPage with `content_depth: STANDARD` | Featured image + 1 inline minimum |
| `content_depth: SHALLOW` | Featured image only |
| Section contains data, stats, or comparisons | Recommend `CHART` or `INFOGRAPHIC` type |
| Section is procedural (how-to) | Recommend `SCREENSHOT` or `DIAGRAM` type |

---

## Alt Text Rules

```
Format: [primary_keyword] + [section_context] + [image_type_descriptor]
Max length: 125 characters
Must not start with "image of" or "picture of"
Must include at least one target keyword from the section
```

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| validated_content_document has no sections | Emit featured image spec only |
| Section count below placement threshold | Reduce inline images to 1; keep featured image |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Image strategies | Supabase | `omniseen_image_strategies` |

---

## Self-Registration Payload

```json
{
  "agent_id": "image-strategy-agent",
  "layer": 3,
  "type": "production",
  "version": "1.0.0",
  "capabilities": ["image-placement", "alt-text-generation", "visual-seo", "asset-specification"],
  "health_endpoint": "/functions/v1/image-strategy/status",
  "critical": false
}
```

---

## Constraints

- Does not fetch, store, or generate image files.
- Alt text must comply with WCAG 2.1 accessibility guidelines.
- Must receive a `PASS` or `PASS_WITH_WARNINGS` validated document — does not accept unvalidated content.

## Error Codes

| Code | Meaning |
|---|---|
| `ISA-001` | validated_content_document schema invalid |
| `ISA-002` | Strategy generation failed |
| `ISA-003` | Supabase persistence failure |
