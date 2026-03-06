---
id: content-cluster-orchestrator
agent: content-architect
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - research_brief (from research-intelligence-agent)
  - omniseen_content_registry (Supabase)
  - omniseen_cluster_map (Supabase)
auto_heal: true
governor_reporting: true
risk_level: HIGH
tags: [clusters, internal-links, topical-authority, seo, cannibalization, content-architect]
project_location: /skills/content-architect/content-cluster-orchestrator.md
---

# content-cluster-orchestrator

> **content-architect / Skill**
> Controls the growth of OmniSeen's topical authority infrastructure. Maps topic relationships, enforces content silo integrity, prevents keyword cannibalization, distributes internal link equity, and coordinates cluster expansion decisions with downstream agents.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `content-cluster-orchestrator` |
| Parent Agent | `content-architect` |
| Layer | 3 — Production |
| Risk Level | HIGH |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

As OmniSeen scales content production, topical coherence and internal link architecture become critical SEO assets. Without deliberate cluster management, the corpus accumulates keyword cannibalization, diluted link equity, and orphaned content — all of which degrade topical authority signals.

This skill enforces cluster-level thinking at the moment of content architecture. Before any SuperPage or supporting page is blueprinted, this skill evaluates where the new piece fits within the existing topical graph, what internal links it should receive and distribute, and whether its creation strengthens or fragments the current authority structure.

---

## 3. Responsibilities

- Build and maintain the topical cluster map across the OmniSeen content corpus
- Evaluate new content requests for cannibalization risk before blueprint generation
- Assign each new piece to a cluster with a defined role (pillar, supporting, bridge)
- Specify internal link slots: which existing pages link to the new piece, and which pages the new piece should link to
- Enforce anchor text variation to prevent over-optimization
- Detect and flag cluster health degradation (orphaned pages, over-linked hubs, thin clusters)
- Recommend cluster expansion priorities based on topical gap analysis
- Integrate with `research-intelligence-agent` output for gap signal alignment

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `research_brief` | `object` | research-intelligence-agent (via orchestrator) | ✅ | Topical clusters, gaps, competitor analysis |
| `job_request` | `object` | generation-orchestrator | ✅ | Topic, job_type, target_url_slug |
| `content_registry` | `object` | Supabase `omniseen_content_registry` | ✅ | All published and in-pipeline pages |
| `cluster_map` | `object` | Supabase `omniseen_cluster_map` | ✅ | Current topical graph state |
| `seo_intelligence_signal` | `object` | research-intelligence-agent | ⚠️ | Updated gap and authority signals |

### `cluster_map` Node Schema

```json
{
  "node_id": "string",
  "url_slug": "string",
  "page_title": "string",
  "primary_keyword": "string",
  "cluster_id": "string",
  "role": "PILLAR | SUPPORTING | BRIDGE | ORPHAN",
  "inbound_internal_links": "integer",
  "outbound_internal_links": "integer",
  "authority_score": "number (0-100)",
  "published_at": "ISO8601 | null",
  "status": "LIVE | IN_PIPELINE | PLANNED"
}
```

### `cannibalization_check` Input

```json
{
  "incoming_primary_keyword": "string",
  "incoming_secondary_keywords": ["string"],
  "existing_pages": [
    {
      "url_slug": "string",
      "primary_keyword": "string",
      "similarity_score": "number (0-1)"
    }
  ]
}
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `cluster_assignment` | `object` | content-architect core → content_blueprint | Cluster role and link slots for the new page |
| `internal_link_directives` | `array` | content_blueprint.internal_links | Specific link instructions |
| `cannibalization_report` | `object` | generation-orchestrator | Risk assessment for the new piece |
| `cluster_map_update` | `object` | Supabase | Updated graph state |
| `cluster_health_report` | `object` | metrics-collector | Corpus-level cluster metrics |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `cluster_assignment` Schema

```json
{
  "cluster_id": "string",
  "cluster_name": "string",
  "assigned_role": "PILLAR | SUPPORTING | BRIDGE",
  "pillar_page_slug": "string | null",
  "cannibalization_risk": "NONE | LOW | MEDIUM | HIGH",
  "cannibalization_conflict_slugs": ["string"],
  "recommended_action": "PROCEED | PROCEED_WITH_MERGE_REVIEW | BLOCK"
}
```

### `internal_link_directive` Schema

```json
{
  "direction": "INBOUND | OUTBOUND",
  "source_slug": "string",
  "target_slug": "string",
  "anchor_text": "string",
  "anchor_variation_group": "string",
  "placement_guidance": "string",
  "link_equity_weight": "LOW | MEDIUM | HIGH"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| `cluster_map` read failure | Supabase query timeout or error | Rebuild partial map from `content_registry`; flag `map_partial: true` |
| Cannibalization check inconclusive | similarity_score between 0.45–0.55 | Flag as `MEDIUM` risk; emit advisory to orchestrator; do not block |
| Cluster map update conflict | Concurrent write detected | Retry with exponential backoff (3x); use last-write-wins with timestamp |
| No cluster found for topic | New topic outside existing clusters | Auto-create new cluster node; assign incoming page as PILLAR |
| Internal link target does not exist | `url_slug` not in registry | Replace with nearest topically-related existing page; flag substitution |
| Over-linked hub detected (>50 inbound) | Hub node inbound count threshold | Redistribute new inbound links to supporting pages in same cluster |

---

## 7. Risk Level

**HIGH**

- Incorrect cluster assignment compounds across the entire content corpus
- Cannibalization misses degrade topical authority at scale
- Internal link errors are persistent (require re-publishing to correct)
- Cluster map corruption affects all subsequent content jobs until repaired

Governor must be notified on every execution — not just on failure.

---

## 8. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Skill activation | `{skill_id, job_id, topic, cluster_id_candidate}` |
| `skill.completed` | Cluster assignment emitted | `{job_id, cluster_id, role, cannibalization_risk, links_assigned}` |
| `skill.degraded` | Auto-heal triggered | `{job_id, reason, heal_action, map_partial}` |
| `skill.blocked` | `recommended_action: BLOCK` | `{job_id, cannibalization_conflict_slugs, reason}` |
| `skill.failed` | Unrecoverable failure | `{job_id, error_code}` |

`skill.blocked` events escalate to `HIGH` severity alert via `alert-dispatcher`.

---

## 9. Execution Flow

```
1. Receive research_brief + job_request
2. Load cluster_map from Supabase
3. Load content_registry for cannibalization lookup
4. Run cannibalization check:
   a. Compare incoming primary + secondary keywords against registry
   b. Compute similarity scores (semantic + keyword overlap)
   c. Assign cannibalization_risk level
   d. If HIGH → emit block signal to orchestrator
5. Identify best-fit cluster from cluster_map:
   a. Match topic to existing cluster by semantic proximity
   b. If no match → create new cluster (incoming page = PILLAR)
6. Assign page role within cluster (PILLAR / SUPPORTING / BRIDGE)
7. Generate internal_link_directives:
   a. INBOUND: select 2–5 existing pages that should link to new page
   b. OUTBOUND: select 3–7 pages the new page should link to
   c. Apply anchor variation rules (no two directives same anchor text)
   d. Assign link_equity_weight based on cluster role
8. Detect cluster health issues:
   a. Orphaned nodes (0 inbound links)
   b. Over-linked hubs (>50 inbound)
   c. Thin clusters (<3 supporting pages)
9. Compile cluster_assignment + internal_link_directives
10. Emit cluster_map_update to Supabase
11. Emit cluster_health_report to metrics-collector
12. Emit governor_event: skill.completed
```

---

## 10. Metrics

| Metric | Description | Target |
|---|---|---|
| `cannibalization_block_rate` | % of jobs blocked due to HIGH cannibalization risk | ≤ 5% |
| `orphan_page_count` | Pages with 0 inbound internal links | ≤ 3% of corpus |
| `avg_cluster_depth` | Mean supporting pages per pillar | ≥ 5 |
| `anchor_variation_score` | Unique anchors / total directives per cluster | ≥ 0.8 |
| `over_linked_hub_count` | Nodes with >50 inbound links | 0 |
| `new_cluster_creation_rate` | New clusters created per 30-day window | Monitored (no hard threshold) |
| `cluster_map_staleness` | Age of last cluster_map update | ≤ 24h |
| `link_equity_distribution_score` | Balance of HIGH/MEDIUM/LOW links across corpus | Monitored |

Metrics emitted to `omniseen_metrics_5m` via `metrics-collector`.

---

## 11. Project Location

```
/skills/content-architect/content-cluster-orchestrator.md
```

### Supabase Tables Required

```
omniseen_cluster_map
omniseen_content_registry
omniseen_cannibalization_log
omniseen_link_directives_history
```

### Event Bus Topics

```
Publishes: omniseen.skill.lifecycle
           omniseen.cluster.updated
           omniseen.cluster.blocked
Reads:     omniseen.agent.registered
           omniseen.system.state_changed
```

---

## Anchor Text Variation Rules

```
For each cluster, maintain an anchor variation register.
Rules:
- No two pages in the same cluster share an identical anchor for the same target
- Exact-match anchors (primary keyword) capped at 20% of total inbound links per page
- Partial-match anchors: 30% max
- Natural/branded anchors: minimum 50%
- Anchor register persisted to omniseen_link_directives_history
```

---

## Cannibalization Thresholds

| Similarity Score | Risk Level | Action |
|---|---|---|
| < 0.35 | NONE | Proceed |
| 0.35–0.54 | LOW | Proceed; log advisory |
| 0.55–0.74 | MEDIUM | Proceed with merge review flag |
| ≥ 0.75 | HIGH | Block; escalate to governor |

---

## Error Codes

| Code | Meaning |
|---|---|
| `CCO-001` | cluster_map read failure — partial rebuild used |
| `CCO-002` | Cannibalization risk HIGH — job blocked |
| `CCO-003` | Cluster assignment failed — no matching cluster found |
| `CCO-004` | Internal link target not found in registry |
| `CCO-005` | Cluster map update conflict — retry exhausted |
| `CCO-006` | Anchor variation register read failure |
| `CCO-007` | Over-linked hub detected — redistribution applied |
