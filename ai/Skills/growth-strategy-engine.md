---
id: growth-strategy-engine
agent: research-intelligence-agent
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - content-cluster-orchestrator
  - serp-intelligence-analyzer
  - omniseen_content_registry (Supabase)
  - omniseen_cluster_map (Supabase)
auto_heal: true
governor_reporting: true
risk_level: MEDIUM
tags: [growth, publishing-cadence, city-expansion, niche-domination, authority-scaling]
project_location: /skills/research-intelligence-agent/growth-strategy-engine.md
---

# growth-strategy-engine

> **research-intelligence-agent / Skill**
> Plans the OmniSeen content growth roadmap. Determines publishing cadence, geographic expansion targets, niche domination sequences, and authority scaling priorities — producing a structured growth plan that drives the content production queue.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `growth-strategy-engine` |
| Parent Agent | `research-intelligence-agent` |
| Layer | 3 — Production |
| Risk Level | MEDIUM |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Organic authority is not built by publishing randomly — it is built by executing a deliberate topical and geographic expansion strategy. This skill analyzes the current content corpus, identifies the highest-leverage growth vectors (underserved niches, competitor-weak geographies, thin clusters), and produces a prioritized growth roadmap that the `generation-orchestrator` can execute against.

---

## 3. Responsibilities

- Analyze current corpus coverage against target niche and geographic markets
- Identify topical clusters with insufficient depth (< 5 supporting pages)
- Identify high-opportunity geographic markets with low competition
- Determine optimal publishing cadence per cluster and geography
- Sequence niche domination: complete clusters before expanding to new ones
- Detect authority dilution (spreading too thin across too many topics)
- Produce a prioritized growth plan with job queue recommendations
- Update the growth plan on a defined review cadence

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `cluster_map` | `object` | Supabase `omniseen_cluster_map` | ✅ | Current topical graph state |
| `content_registry` | `object` | Supabase `omniseen_content_registry` | ✅ | All published content |
| `serp_signals` | `object` | serp-intelligence-analyzer | ⚠️ | Opportunity signals by keyword and geography |
| `growth_config` | `object` | system config | ✅ | Target markets, niches, cadence settings |

### `growth_config` Schema

```json
{
  "target_niches": ["string"],
  "target_geographies": ["string"],
  "publishing_cadence": {
    "articles_per_week": "integer",
    "superpages_per_month": "integer"
  },
  "authority_depth_threshold": "integer",
  "max_active_clusters": "integer"
}
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `growth_roadmap` | `object` | generation-orchestrator (job queue) | Prioritized content production plan |
| `cadence_schedule` | `object` | generation-orchestrator | Publishing schedule for next 30 days |
| `expansion_signals` | `array` | metrics-collector | Growth opportunity metrics |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `growth_roadmap` Schema

```json
{
  "generated_at": "ISO8601",
  "review_period_days": "integer",
  "priority_clusters": [
    {
      "cluster_id": "string",
      "cluster_name": "string",
      "current_depth": "integer",
      "target_depth": "integer",
      "gap_pages_needed": "integer",
      "priority_score": "number (0-1)",
      "geography": "string | null"
    }
  ],
  "recommended_job_queue": [
    {
      "job_rank": "integer",
      "topic": "string",
      "job_type": "SUPERPAGE | SUPPORTING_CONTENT",
      "cluster_id": "string",
      "geography": "string | null",
      "rationale": "string"
    }
  ],
  "publishing_cadence": "object",
  "authority_dilution_risk": "NONE | LOW | MEDIUM | HIGH"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| cluster_map stale > 24h | Timestamp check | Request refresh from content-cluster-orchestrator |
| All clusters at target depth | No gap detected | Expand analysis to new niche or geography |
| Authority dilution detected | Active clusters > max_active_clusters | Pause new cluster creation; complete existing |
| Publishing cadence overload | Queue depth > 2x weekly capacity | Reduce job queue recommendations to match capacity |
| SERP signals unavailable | serp-intelligence-analyzer offline | Use existing corpus data only; flag `reduced_confidence` |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Roadmap generation triggered | `{skill_id, corpus_size, cluster_count}` |
| `skill.completed` | Roadmap emitted | `{jobs_recommended, clusters_prioritized, cadence}` |
| `growth.dilution_risk` | HIGH dilution detected | `{active_clusters, max_allowed, recommendation}` |
| `skill.degraded` | Reduced confidence mode | `{reason, data_sources_available}` |

---

## 8. Execution Flow

```
1. Load cluster_map + content_registry
2. For each cluster:
   a. Count current supporting pages vs authority_depth_threshold
   b. Compute gap_pages_needed
   c. Score priority: gap size × competition level × commercial intent
3. Identify new geographic opportunities from growth_config + SERP signals
4. Check authority_dilution_risk:
   a. If active clusters > max_active_clusters → set dilution flag
5. Build recommended_job_queue sorted by priority_score
6. Generate cadence_schedule aligned to publishing_cadence config
7. Cap queue at 4-week forward horizon
8. Emit growth_roadmap to generation-orchestrator
9. Emit expansion_signals to metrics-collector
10. Schedule next roadmap review (default: 7 days)
11. Emit governor_event: skill.completed
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| Corpus is empty (new account) | LOW | Generate bootstrap roadmap from growth_config only |
| All target niches saturated | MEDIUM | Advisory; recommend niche pivot options |
| Cadence config missing | MEDIUM | Apply default cadence (3 articles/week, 1 superpage/month) |
| cluster_map and registry both unavailable | HIGH | Suspend roadmap generation; retry in 30 min |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `avg_cluster_completion_rate` | Progress toward depth threshold per 30 days |
| `publishing_cadence_adherence` | ≥ 90% of scheduled jobs executed on time |
| `authority_dilution_events` | 0 per quarter |
| `roadmap_freshness` | Reviewed every ≤ 7 days |
| `new_geography_targets_per_quarter` | Defined in growth_config |

---

## 11. Project Location

```
/skills/research-intelligence-agent/growth-strategy-engine.md
```

### Supabase Tables
```
omniseen_growth_roadmaps
omniseen_growth_history
```

## Error Codes

| Code | Meaning |
|---|---|
| `GSE-001` | cluster_map unavailable |
| `GSE-002` | Authority dilution risk HIGH |
| `GSE-003` | Publishing cadence overload — queue capped |
| `GSE-004` | SERP signals unavailable — reduced confidence |
| `GSE-005` | Roadmap generation failure |
