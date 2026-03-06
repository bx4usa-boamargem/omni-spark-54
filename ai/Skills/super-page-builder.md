---
id: super-page-builder
agent: content-architect
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - article-structure-intelligence
  - content-cluster-orchestrator
  - research_brief
auto_heal: true
governor_reporting: true
risk_level: HIGH
tags: [superpage, pillar, long-form, authority, conversion, content-architect]
project_location: /skills/content-architect/super-page-builder.md
---

# super-page-builder

> **content-architect / Skill**
> Responsible for designing OmniSeen SuperPages — pillar-level, long-form authority pages with conversion-aware layout and full section orchestration. The highest-value content asset type in the OmniSeen system.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `super-page-builder` |
| Parent Agent | `content-architect` |
| Layer | 3 — Production |
| Risk Level | HIGH |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

A SuperPage is not a long blog post. It is a topical authority asset engineered to rank for a primary keyword cluster, serve as the internal link hub for a content silo, and convert organic traffic into leads or activations. This skill designs SuperPage blueprints with explicit conversion architecture, section orchestration, and authority signal density — distinct from standard supporting content.

---

## 3. Responsibilities

- Define SuperPage layout: hero section, authority body, conversion zones, FAQ, trust signals
- Orchestrate section sequencing for maximum dwell time and conversion probability
- Define conversion-aware sections (CTA placement, lead capture zones, social proof blocks)
- Set word count targets per section calibrated to `DEEP` content depth
- Integrate cluster context from `content-cluster-orchestrator` to position the page as PILLAR
- Specify E-E-A-T density requirements above standard content thresholds
- Produce a complete SuperPage blueprint for `content-writer`

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `research_brief` | `object` | research-intelligence-agent | ✅ | Full topical + competitor analysis |
| `cluster_assignment` | `object` | content-cluster-orchestrator | ✅ | Cluster role confirmation (must be PILLAR) |
| `structure_report` | `object` | article-structure-intelligence | ✅ | Validated heading framework |
| `job_config` | `object` | generation-orchestrator | ✅ | Target audience, locale, conversion goal |

### SuperPage Section Types

```
HERO              — H1 + authority positioning statement
PROBLEM_FRAME     — Stakes and consequences for reader
AUTHORITY_BODY    — Core H2 knowledge sections (5–10 blocks)
PROOF_BLOCK       — Data, case reference, or expert signal
CTA_PRIMARY       — First conversion zone (above fold equivalent)
FAQ               — 6–12 question/answer blocks targeting PAA signals
CTA_SECONDARY     — Second conversion zone (post-body)
TRUST_SIGNALS     — Author bio, publication date, credentials
INTERNAL_CLUSTER  — Curated links to supporting pages
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `superpage_blueprint` | `object` | content-writer (via orchestrator) | Complete SuperPage specification |
| `conversion_zone_map` | `object` | publisher-agent | CTA placement instructions for deploy |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `superpage_blueprint` Schema

```json
{
  "job_id": "string",
  "page_type": "SUPERPAGE",
  "target_url_slug": "string",
  "primary_keyword": "string",
  "page_title": "string",
  "meta_description_guidance": "string",
  "sections": [
    {
      "section_type": "string",
      "heading_level": "string",
      "heading_text": "string",
      "section_purpose": "string",
      "word_count_target": "integer",
      "conversion_element": "string | null",
      "eeat_requirement": "string | null",
      "target_keywords": ["string"]
    }
  ],
  "total_word_count_target": "integer",
  "faq_targets": ["string"],
  "conversion_goal": "string",
  "eeat_density": "STANDARD | HIGH | MAXIMUM",
  "cluster_role": "PILLAR"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Cluster assignment is not PILLAR | `assigned_role != PILLAR` | Escalate to orchestrator; request role re-evaluation |
| Word count target below DEEP minimum | Total < 3,500 words | Expand AUTHORITY_BODY sections from research_brief gaps |
| No CTA section defined | conversion_element null in all sections | Inject CTA_PRIMARY after section 3; CTA_SECONDARY at end |
| FAQ targets < 6 | faq_targets count low | Pull from research_brief PAA signals or competitor FAQs |
| structure_report not PASS | Upstream validation failed | Block execution; emit skill.failed |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Activation | `{skill_id, job_id, cluster_id, conversion_goal}` |
| `skill.completed` | Blueprint emitted | `{job_id, total_sections, word_count_target, eeat_density}` |
| `skill.degraded` | Auto-correction applied | `{job_id, corrections}` |
| `skill.failed` | Unresolvable input failure | `{job_id, error_code}` |

---

## 8. Execution Flow

```
1. Validate cluster_assignment.assigned_role = PILLAR
2. Load research_brief topical clusters + competitor analysis
3. Load structure_report approved heading framework
4. Define section sequence (HERO → TRUST_SIGNALS order)
5. Assign word_count_target per section based on DEEP thresholds
6. Place CTA_PRIMARY and CTA_SECONDARY at optimal conversion positions
7. Build FAQ targets from PAA signals in research_brief
8. Set eeat_density based on competitor authority gap
9. Assemble superpage_blueprint
10. Compile conversion_zone_map for publisher-agent
11. Emit governor_event: skill.completed
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| Cluster role not PILLAR | HIGH | Skill blocked; orchestrator notified |
| research_brief missing competitor data | MEDIUM | Proceed with reduced AUTHORITY_BODY depth |
| Total word count < 2,000 after expansion | HIGH | Blueprint rejected |
| No conversion goal defined | MEDIUM | Default to `LEAD_CAPTURE`; flag advisory |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `avg_superpage_word_count` | ≥ 3,500 |
| `cta_placement_compliance` | 100% of SuperPages have ≥ 2 CTAs |
| `faq_section_coverage` | ≥ 6 FAQ items per page |
| `eeat_density_rate` | ≥ 85% at HIGH or MAXIMUM |
| `blueprint_rejection_rate` | ≤ 3% |

---

## 11. Project Location

```
/skills/content-architect/super-page-builder.md
```

## Error Codes

| Code | Meaning |
|---|---|
| `SPB-001` | Cluster role not PILLAR |
| `SPB-002` | Word count below minimum after expansion |
| `SPB-003` | structure_report validation failed upstream |
| `SPB-004` | No conversion goal defined — default applied |
| `SPB-005` | Blueprint assembly failure |
