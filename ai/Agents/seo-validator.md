---
id: seo-validator
layer: 3
type: production
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - generation-orchestrator
  - content-writer
blocks: []
tags: [seo, validation, eeat, technical-seo, authority, layer-3]
---

# seo-validator

> **Layer 3 — Production Agent**
> SEO authority and E-E-A-T validation engine. Audits the `content_document` against technical SEO rules and E-E-A-T signal requirements before the content proceeds to image strategy and publishing.

---

## Purpose

Acts as the quality gate between content generation and publishing. Validates that the produced content meets OmniSeen's SEO standards, E-E-A-T signal requirements, and technical correctness before any downstream steps execute.

---

## Responsibilities

- Validate primary and secondary keyword presence and density
- Audit heading hierarchy for SEO correctness
- Validate meta title and meta description length and keyword inclusion
- Check E-E-A-T signal completeness against blueprint requirements
- Validate internal link structure
- Detect keyword stuffing, thin content, and duplicate heading issues
- Emit a validation report with PASS / FAIL / WARNINGS per check
- Block pipeline on FAIL; allow pipeline to continue on WARNING

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator | ✅ | Task parameters with content_document |
| `content_document` | `object` | content-writer (via orchestrator) | ✅ | Full generated content |
| `content_blueprint` | `object` | content-architect (via orchestrator) | ✅ | Original structural spec for compliance check |

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `validation_report` | `object` | generation-orchestrator | Full audit results |
| `validated_content_document` | `object` | generation-orchestrator → image-strategy-agent | Content with validation metadata attached |
| `task_result` | `object` | generation-orchestrator | Completion signal |

### `validation_report` Schema

```json
{
  "job_id": "string",
  "overall_status": "PASS | FAIL | PASS_WITH_WARNINGS",
  "checks": [
    {
      "check_id": "string",
      "check_name": "string",
      "status": "PASS | FAIL | WARNING",
      "detail": "string | null",
      "blocking": "boolean"
    }
  ],
  "keyword_density": {
    "primary": "number (0-1)",
    "secondary": "object"
  },
  "word_count": "integer",
  "eeat_score": "integer (0-100)",
  "blocking_failures": ["string"],
  "warnings": ["string"],
  "validated_at": "ISO8601"
}
```

---

## Validation Checks

| Check ID | Check Name | Blocking |
|---|---|---|
| `SEO-C01` | Primary keyword in H1 | ✅ |
| `SEO-C02` | Primary keyword in meta title | ✅ |
| `SEO-C03` | Meta title length 50–60 chars | ⚠️ |
| `SEO-C04` | Meta description length 140–160 chars | ⚠️ |
| `SEO-C05` | Primary keyword density 0.5–2.5% | ✅ |
| `SEO-C06` | No duplicate H2 headings | ✅ |
| `SEO-C07` | Minimum word count met (per depth config) | ✅ |
| `SEO-C08` | E-E-A-T signals present per blueprint spec | ✅ |
| `SEO-C09` | Internal links present and valid | ⚠️ |
| `SEO-C10` | No keyword stuffing detected (>3% density) | ✅ |
| `SEO-C11` | Secondary keywords present in H2/H3 | ⚠️ |
| `SEO-C12` | Semantic keywords present in body | ⚠️ |

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `TASK_RECEIVED` | `task_dispatch` with content_document arrives | Run all validation checks |
| `ALL_CHECKS_PASS` | No blocking failures | Emit PASS report + `validated_content_document` |
| `BLOCKING_FAILURE` | Any `blocking: true` check fails | Emit FAIL report; block pipeline |
| `WARNINGS_ONLY` | No blocking failures, warnings present | Emit PASS_WITH_WARNINGS; continue pipeline |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| content_document schema invalid | Fail immediately with `SV-001` |
| content_blueprint unavailable | Run checks that don't require blueprint; flag blueprint-dependent checks as SKIPPED |
| Word count check edge case | Use `content_depth` from job config for threshold lookup |

---

## Minimum Word Count Thresholds

| content_depth | Minimum Words |
|---|---|
| `SHALLOW` | 800 |
| `STANDARD` | 1,800 |
| `DEEP` | 3,500 |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Validation reports | Supabase | `omniseen_validation_reports` |

---

## Self-Registration Payload

```json
{
  "agent_id": "seo-validator",
  "layer": 3,
  "type": "production",
  "version": "1.0.0",
  "capabilities": ["seo-audit", "eeat-validation", "keyword-analysis", "technical-seo-checks", "pipeline-gating"],
  "health_endpoint": "/functions/v1/seo-validator/status",
  "critical": false
}
```

---

## Constraints

- A `FAIL` result halts the pipeline — `generation-orchestrator` will not advance to `image-strategy-agent`.
- Does not modify content — validation only.
- All 12 checks must execute; no check may be silently skipped.

## Error Codes

| Code | Meaning |
|---|---|
| `SV-001` | content_document schema invalid |
| `SV-002` | content_blueprint unavailable — partial validation only |
| `SV-003` | Blocking validation failure — pipeline halted |
| `SV-004` | Validation engine internal error |
