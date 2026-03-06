---
id: article-structure-intelligence
agent: content-architect
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - research_brief (from research-intelligence-agent)
  - content_blueprint (from content-architect core)
auto_heal: true
governor_reporting: true
risk_level: MEDIUM
tags: [structure, headings, readability, nlp, semantic-flow, content-architect]
project_location: /skills/content-architect/article-structure-intelligence.md
---

# article-structure-intelligence

> **content-architect / Skill**
> Controls article architecture logic. Enforces heading hierarchy, readability scoring, NLP flow validation, and semantic section progression before any content is written.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `article-structure-intelligence` |
| Parent Agent | `content-architect` |
| Layer | 3 — Production |
| Risk Level | MEDIUM |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Ensure every article produced by OmniSeen follows a structurally sound, semantically progressive architecture before prose generation begins. Poor heading hierarchies and disconnected section flows are among the most common causes of thin-content penalties and low dwell time. This skill enforces structure as a hard constraint — not a suggestion.

---

## 3. Responsibilities

- Validate and enforce H1→H2→H3→H4 heading hierarchy rules
- Score article structure for readability against Flesch-Kincaid and semantic coherence models
- Detect non-progressive section ordering (e.g., conclusion before body, definition after advanced concepts)
- Enforce section length balance across heading levels
- Validate NLP topic flow — each section must connect semantically to adjacent sections
- Reject or auto-restructure blueprints that violate hierarchy or flow rules
- Produce a structure validation report consumed by `content-architect` before blueprint is dispatched to `content-writer`

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `draft_blueprint` | `object` | content-architect core | ✅ | Pre-generation heading structure |
| `research_brief` | `object` | research-intelligence-agent | ✅ | Topical clusters for semantic flow validation |
| `content_depth` | `string` | job_request config | ✅ | SHALLOW / STANDARD / DEEP |
| `target_audience` | `string` | job_request config | ✅ | Informs readability target level |

### Heading Hierarchy Rules

```
H1: exactly 1 per document
H2: 3–12 per document (depth-dependent)
H3: max 4 per H2 parent
H4: max 2 per H3 parent
No heading level may be skipped (H1 → H3 without H2 is invalid)
No two adjacent H2s may target identical semantic territory
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `structure_validation_report` | `object` | content-architect core | Pass/fail with specific violations |
| `approved_blueprint` | `object` | content-architect → content-writer | Validated or auto-corrected blueprint |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `structure_validation_report` Schema

```json
{
  "status": "PASS | FAIL | AUTO_CORRECTED",
  "violations": [
    {
      "rule_id": "string",
      "heading_text": "string",
      "violation": "string",
      "auto_corrected": "boolean"
    }
  ],
  "readability_score": "number (0-100)",
  "semantic_flow_score": "number (0-1)",
  "section_balance_score": "number (0-1)",
  "total_sections": "integer",
  "corrections_applied": "integer"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Missing H1 | H1 count = 0 | Promote first H2 to H1; log correction |
| Skipped heading level | H1 → H3 detected | Insert generated H2 between levels |
| Duplicate adjacent H2 semantics | Similarity score > 0.75 | Merge sections; redistribute content targets |
| Section count below minimum | H2 < 3 for STANDARD depth | Expand from topical cluster gaps in research_brief |
| Semantic flow break | Adjacent section similarity < 0.25 | Reorder sections by semantic proximity |
| Readability score < 40 | Score below threshold | Flag for `humanization-layer-skill`; do not block |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Activation | `{skill_id, job_id, section_count}` |
| `skill.completed` | Validation complete | `{job_id, status, corrections_applied, readability_score}` |
| `skill.degraded` | Auto-correction applied | `{job_id, violations_corrected}` |
| `skill.failed` | Unresolvable structure | `{job_id, error_code, blocking_violations}` |

---

## 8. Execution Flow

```
1. Receive draft_blueprint from content-architect core
2. Run heading hierarchy validation (H1/H2/H3/H4 rules)
3. Run semantic flow check (adjacent section similarity)
4. Compute readability score against target_audience level
5. Compute section balance score (word_count_target distribution)
6. For each violation:
   a. Attempt auto-correction per heal rules
   b. If auto-correctable → apply and log
   c. If not → add to blocking_violations
7. If blocking_violations > 0 → emit skill.failed
8. If corrections applied → emit skill.degraded + approved_blueprint
9. If no violations → emit skill.completed + approved_blueprint
10. Persist structure_validation_report to Supabase
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| Unresolvable heading hierarchy | HIGH | Blueprint rejected; job paused |
| Readability score critically low (<25) | MEDIUM | Blueprint passed with warning flag |
| Semantic flow score < 0.3 after correction | HIGH | Blueprint rejected; research_brief re-requested |
| Section count = 0 | CRITICAL | Immediate job failure; governor notified |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `avg_readability_score` | ≥ 60 |
| `semantic_flow_score` | ≥ 0.65 |
| `auto_correction_rate` | ≤ 20% of jobs |
| `blueprint_rejection_rate` | ≤ 5% |
| `section_balance_score` | ≥ 0.7 |

---

## 11. Project Location

```
/skills/content-architect/article-structure-intelligence.md
```

### Supabase Tables
```
omniseen_structure_validation_reports
```

## Error Codes

| Code | Meaning |
|---|---|
| `ASI-001` | H1 missing — auto-promoted |
| `ASI-002` | Heading level skipped — auto-inserted |
| `ASI-003` | Semantic flow break — reorder applied |
| `ASI-004` | Section count zero — job failed |
| `ASI-005` | Unresolvable hierarchy — blueprint rejected |
