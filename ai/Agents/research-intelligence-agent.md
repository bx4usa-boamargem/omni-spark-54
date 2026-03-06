---
id: research-intelligence-agent
layer: 3
type: production
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - generation-orchestrator
blocks: []
tags: [research, serp, topical-authority, keyword-intelligence, layer-3]
---

# research-intelligence-agent

> **Layer 3 — Production Agent**
> SERP landscape analyzer and topical intelligence engine. Produces the research foundation required by `content-architect` to design authority structures.

---

## Purpose

Executes topic research by analyzing search landscapes, identifying topical gaps, mapping competitor authority, and extracting intent signals. All outputs feed directly into the content architecture step.

---

## Responsibilities

- Analyze SERP landscape for target topic and related queries
- Extract topical clusters and subtopic coverage gaps
- Map competitor content depth and authority signals
- Identify primary, secondary, and semantic keyword sets
- Determine search intent distribution (informational, navigational, commercial, transactional)
- Produce a structured research brief for `content-architect`

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator | ✅ | Job parameters and topic definition |
| `serp_data` | `object` | External SERP API | ✅ | Raw SERP results for target queries |
| `competitor_pages` | `array` | External fetch | ⚠️ | Top-10 competitor page content |

### Task Input (from `task_dispatch.input`)

```json
{
  "topic": "string",
  "locale": "string",
  "content_depth": "SHALLOW | STANDARD | DEEP",
  "target_audience": "string",
  "seed_keywords": ["string"]
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `research_brief` | `object` | generation-orchestrator → content-architect | Complete research output |
| `task_result` | `object` | generation-orchestrator | Task completion signal with brief attached |

### `research_brief` Schema

```json
{
  "topic": "string",
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "semantic_keywords": ["string"],
  "search_intent": {
    "informational": "number (0-1)",
    "navigational": "number (0-1)",
    "commercial": "number (0-1)",
    "transactional": "number (0-1)"
  },
  "topical_clusters": [
    {
      "cluster_name": "string",
      "subtopics": ["string"],
      "coverage_gap": "boolean"
    }
  ],
  "competitor_analysis": [
    {
      "url": "string",
      "estimated_authority": "LOW | MEDIUM | HIGH",
      "word_count": "integer",
      "key_topics_covered": ["string"],
      "identified_gaps": ["string"]
    }
  ],
  "recommended_content_angle": "string",
  "eeat_signals_required": ["string"],
  "research_depth": "SHALLOW | STANDARD | DEEP",
  "generated_at": "ISO8601"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `TASK_RECEIVED` | `task_dispatch` arrives from orchestrator | Begin SERP fetch + analysis |
| `SERP_COMPLETE` | SERP data retrieved | Run topical cluster analysis |
| `COMPETITOR_FETCH_COMPLETE` | Competitor pages retrieved | Run gap analysis |
| `ANALYSIS_COMPLETE` | All analysis steps done | Compile `research_brief`; emit `task_result` |
| `SERP_API_FAILURE` | SERP API unavailable | Retry 3x; fallback to cached data if available |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| SERP API unavailable | Use cached SERP data if < 24h old; else fail task with `RIA-002` |
| Competitor fetch blocked | Skip competitor analysis; mark `competitor_analysis: []` in brief |
| Insufficient SERP results | Proceed with available data; flag `low_data_confidence: true` in brief |
| Analysis timeout | Return partial brief with available fields completed |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Research briefs | Supabase | `omniseen_research_briefs` |
| SERP cache | Supabase | `omniseen_serp_cache` |

---

## Self-Registration Payload

```json
{
  "agent_id": "research-intelligence-agent",
  "layer": 3,
  "type": "production",
  "version": "1.0.0",
  "capabilities": ["serp-analysis", "topical-clustering", "competitor-gap-analysis", "keyword-intelligence", "intent-classification"],
  "health_endpoint": "/functions/v1/research-agent/status",
  "critical": false
}
```

---

## Constraints

- Executes only when dispatched by `generation-orchestrator`.
- Does not write content — research output only.
- Must not expose raw competitor content in outputs.

## Error Codes

| Code | Meaning |
|---|---|
| `RIA-001` | Task input schema invalid |
| `RIA-002` | SERP API unavailable — no cache available |
| `RIA-003` | Analysis timeout |
| `RIA-004` | research_brief compilation failed |
