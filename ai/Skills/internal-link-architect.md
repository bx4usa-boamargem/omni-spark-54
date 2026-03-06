---
id: internal-link-architect
agent: content-architect
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - content-cluster-orchestrator
  - omniseen_content_registry (Supabase)
  - omniseen_link_directives_history (Supabase)
auto_heal: true
governor_reporting: true
risk_level: HIGH
tags: [internal-links, anchor-diversity, authority-flow, crawl, seo, content-architect]
project_location: /skills/content-architect/internal-link-architect.md
---

# internal-link-architect

> **content-architect / Skill**
> Controls the OmniSeen internal linking graph. Manages anchor diversity, authority flow distribution, crawl path optimization, and link equity allocation across the entire content corpus.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `internal-link-architect` |
| Parent Agent | `content-architect` |
| Layer | 3 — Production |
| Risk Level | HIGH |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Internal linking is the primary mechanism through which OmniSeen distributes topical authority across its content corpus. A poorly managed internal link graph causes crawl inefficiency, diluted equity, anchor over-optimization, and orphaned pages. This skill governs every internal link decision with precision — ensuring authority flows from pillar pages to supporting content, crawl paths are logical, and anchor text never triggers over-optimization signals.

---

## 3. Responsibilities

- Generate and validate internal link directives for every new content piece
- Maintain and update the internal link graph (`omniseen_link_graph`)
- Enforce anchor text variation rules across the corpus (no over-optimization)
- Distribute link equity from PILLAR pages to SUPPORTING and BRIDGE pages
- Ensure every new page receives minimum inbound links before publication
- Detect and flag crawl depth issues (pages > 3 clicks from homepage)
- Detect and repair orphaned pages (0 inbound links)
- Prevent link dilution on hub pages (cap outbound links per page)

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `cluster_assignment` | `object` | content-cluster-orchestrator | ✅ | Cluster role and topical context |
| `content_registry` | `object` | Supabase | ✅ | All published + pipeline pages |
| `link_graph` | `object` | Supabase `omniseen_link_graph` | ✅ | Current internal link state |
| `link_history` | `object` | Supabase `omniseen_link_directives_history` | ✅ | Anchor text usage log |
| `new_page_meta` | `object` | content-architect core | ✅ | New page slug, title, primary keyword |

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `link_directives` | `array` | content_blueprint.internal_links | Inbound + outbound link specs |
| `link_graph_update` | `object` | Supabase | Updated graph state |
| `link_health_report` | `object` | metrics-collector | Corpus link health metrics |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `link_directive` Schema

```json
{
  "directive_id": "string (uuid)",
  "direction": "INBOUND | OUTBOUND",
  "source_slug": "string",
  "target_slug": "string",
  "anchor_text": "string",
  "anchor_type": "EXACT_MATCH | PARTIAL_MATCH | NATURAL | BRANDED | GENERIC",
  "link_equity_weight": "LOW | MEDIUM | HIGH",
  "placement_section": "string",
  "crawl_depth_from_home": "integer",
  "approved": "boolean"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| New page has 0 inbound links | Inbound count = 0 | Select 2 topically adjacent existing pages; auto-assign inbound directives |
| Orphaned page detected | Existing page with 0 inbound | Add to repair queue; assign inbound link from nearest cluster PILLAR |
| Anchor over-optimization | Exact-match anchor > 20% for target | Replace with natural anchor variants from synonym set |
| Hub page outbound link cap exceeded (>100) | Outbound count threshold | Distribute excess links to supporting pages in same cluster |
| Crawl depth > 3 | Depth calculation exceeds threshold | Insert bridging link from shallower page |
| Link graph read failure | Supabase timeout | Rebuild from content_registry + link_directives_history |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Activation | `{skill_id, job_id, new_page_slug, cluster_id}` |
| `skill.completed` | Directives emitted | `{job_id, inbound_assigned, outbound_assigned, orphans_repaired}` |
| `skill.degraded` | Auto-heal applied | `{job_id, heal_actions}` |
| `skill.failed` | Link graph unresolvable | `{job_id, error_code}` |

---

## 8. Execution Flow

```
1. Load link_graph + link_history from Supabase
2. Map new page into cluster topology
3. Determine page crawl depth from homepage
4. If crawl depth > 3 → find bridging page; add to inbound candidates
5. Select INBOUND link sources (2–5 pages):
   a. Prioritize PILLAR pages in same cluster
   b. Prioritize pages with high link equity weight
   c. Check anchor history — avoid exact-match duplication
6. Select OUTBOUND link targets (3–7 pages):
   a. Prioritize topically adjacent SUPPORTING pages
   b. Must include at least 1 link to cluster PILLAR
   c. Respect hub outbound cap
7. Generate anchor text per directive:
   a. Check anchor type distribution in link_history
   b. Enforce: max 20% exact-match, max 30% partial, min 50% natural/branded
8. Compile link_directives array
9. Scan corpus for orphaned pages → add repair directives
10. Update omniseen_link_graph
11. Emit link_health_report to metrics-collector
12. Emit governor_event: skill.completed
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| Link graph read fails + no history fallback | HIGH | Job paused; graph rebuild attempted |
| New page crawl depth > 5 after heal | HIGH | Flag to governor; manual review recommended |
| Anchor over-optimization corpus-wide | HIGH | Immediate alert; batch repair triggered |
| Zero eligible inbound sources | MEDIUM | Use homepage as fallback inbound source |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `orphan_page_rate` | ≤ 2% of corpus |
| `avg_inbound_links_new_page` | ≥ 3 at publication |
| `exact_match_anchor_rate` | ≤ 20% per target page |
| `avg_crawl_depth` | ≤ 3 clicks from homepage |
| `hub_link_cap_violations` | 0 |
| `link_graph_staleness` | ≤ 12h |

---

## 11. Project Location

```
/skills/content-architect/internal-link-architect.md
```

### Supabase Tables
```
omniseen_link_graph
omniseen_link_directives_history
omniseen_orphan_repair_queue
```

## Error Codes

| Code | Meaning |
|---|---|
| `ILA-001` | Link graph read failure |
| `ILA-002` | New page crawl depth > 3 — bridge inserted |
| `ILA-003` | Anchor over-optimization detected |
| `ILA-004` | Hub outbound cap exceeded — redistributed |
| `ILA-005` | Zero inbound sources — homepage fallback used |
| `ILA-006` | Orphaned page repair failed |
