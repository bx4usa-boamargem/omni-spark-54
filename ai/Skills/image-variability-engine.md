---
id: image-variability-engine
agent: image-strategy-agent
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - validated_content_document (from seo-validator)
  - omniseen_image_usage_history (Supabase)
auto_heal: true
governor_reporting: true
risk_level: MEDIUM
tags: [images, variability, anti-footprint, entropy, visual-strategy, image-strategy-agent]
project_location: /skills/image-strategy-agent/image-variability-engine.md
---

# image-variability-engine

> **image-strategy-agent / Skill**
> Controls image source diversity, prevents visual repetition across the OmniSeen content corpus, and applies entropy-based selection to ensure each article receives contextually unique, semantically aligned visual assets.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `image-variability-engine` |
| Parent Agent | `image-strategy-agent` |
| Layer | 3 — Production |
| Risk Level | MEDIUM |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Eliminate repetitive image patterns across generated articles at scale. As OmniSeen produces 50+ articles on related topics, the risk of visual fingerprinting increases — where multiple pages share similar or identical image compositions, stock photo styles, or visual metaphors that signal AI-generated content to both users and crawlers.

This skill enforces high visual variability by tracking historical image usage, scoring new selections for entropy, rotating provider sources, and aligning visual choices to the semantic context of each content section.

---

## 3. Responsibilities

- Maintain and query the image usage history registry (`omniseen_image_usage_history`)
- Score candidate image selections using an entropy model before approval
- Prevent visual similarity across articles published within the same 30-day window
- Rotate image sources across configured providers per article
- Enforce style diversity (photography, illustration, diagram, screenshot, infographic)
- Flag low-entropy selections and trigger fallback provider logic
- Report image diversity metrics to `metrics-collector` via governor
- Apply cost-aware logic when selecting between provider tiers

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `validated_content_document` | `object` | seo-validator (via orchestrator) | ✅ | Provides section topics for semantic alignment |
| `image_placement_directives` | `array` | image-strategy-agent core | ✅ | List of image slots with type and purpose |
| `usage_history` | `object` | Supabase `omniseen_image_usage_history` | ✅ | Historical image usage for repetition detection |
| `provider_config` | `object` | system config | ✅ | Available image providers, tiers, and cost limits |
| `job_metadata` | `object` | generation-orchestrator | ✅ | Topic, locale, cluster context |

### `image_placement_directive` Schema

```json
{
  "slot_id": "string",
  "placement_after_section": "string",
  "image_type": "DIAGRAM | PHOTO | INFOGRAPHIC | SCREENSHOT | CHART",
  "semantic_context": "string",
  "priority": "REQUIRED | OPTIONAL"
}
```

### `provider_config` Schema

```json
{
  "providers": [
    {
      "provider_id": "string",
      "type": "stock | generative | diagram | screenshot",
      "cost_tier": "FREE | LOW | MEDIUM | HIGH",
      "daily_limit": "integer",
      "styles_available": ["string"]
    }
  ],
  "max_same_provider_per_article": "integer",
  "cost_budget_per_job": "number"
}
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `image_selections` | `array` | image-strategy-agent → publisher-agent | Approved image specs per slot |
| `entropy_report` | `object` | metrics-collector | Variability scores per selection |
| `usage_history_update` | `object` | Supabase | New entries to persist |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `image_selection` Schema

```json
{
  "slot_id": "string",
  "provider_id": "string",
  "image_type": "string",
  "style": "string",
  "semantic_alignment_score": "number (0-1)",
  "entropy_score": "number (0-1)",
  "alt_text": "string",
  "file_name": "string",
  "cost_tier": "string",
  "approved": "boolean",
  "fallback_used": "boolean"
}
```

### `entropy_report` Schema

```json
{
  "job_id": "string",
  "total_slots": "integer",
  "avg_entropy_score": "number (0-1)",
  "low_entropy_flags": "integer",
  "fallbacks_triggered": "integer",
  "provider_distribution": "object",
  "style_distribution": "object"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Primary provider unavailable | HTTP 4xx/5xx on provider API | Switch to next available provider in tier order |
| Entropy score below threshold (<0.4) | Entropy model returns low score | Re-query with different style parameter; retry up to 3x |
| Usage history read failure | Supabase query timeout | Use in-memory cache of last 500 entries; flag `history_partial` |
| All providers exhausted | No provider returns approved selection | Use neutral placeholder spec; emit `IVE-004` to governor |
| Cost budget exceeded | Running cost sum exceeds `cost_budget_per_job` | Downgrade remaining slots to FREE tier; log budget event |
| Style distribution imbalance | >70% of selections same style | Force style rotation on remaining slots |

---

## 7. Risk Level

**MEDIUM**

- Failure does not block content publication (images are not inline prose)
- High repetition risk is reputational, not structural
- Budget overrun risk requires cost-aware guardrails
- `publisher-agent` can proceed with placeholder directives if this skill partially fails

---

## 8. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Skill activation | `{skill_id, job_id, slot_count}` |
| `skill.completed` | All slots resolved | `{job_id, entropy_report, fallbacks_used}` |
| `skill.degraded` | Auto-heal triggered | `{job_id, reason, heal_action}` |
| `skill.failed` | Unrecoverable failure | `{job_id, error_code, slots_unresolved}` |

All events emitted to `omniseen.skill.lifecycle` topic → consumed by `event-logger`.

---

## 9. Execution Flow

```
1. Receive image_placement_directives + validated_content_document
2. Load usage_history from Supabase (last 30 days, same topic cluster)
3. For each image slot:
   a. Extract semantic_context from corresponding content section
   b. Query provider_config for eligible providers
   c. Generate candidate selection (provider + style + type)
   d. Compute entropy_score against usage_history
   e. If entropy_score < 0.4 → retry with alternate style (max 3x)
   f. If retries exhausted → trigger auto-heal (provider rotation)
   g. Compute semantic_alignment_score against section context
   h. If both scores pass thresholds → approve selection
4. Check provider distribution across all slots
   - If >max_same_provider_per_article → redistribute
5. Check cost running total
   - If > budget → downgrade remaining slots
6. Compile image_selections array
7. Persist usage_history_update to Supabase
8. Emit entropy_report to metrics-collector
9. Emit governor_event: skill.completed
```

---

## 10. Metrics

| Metric | Description | Target |
|---|---|---|
| `avg_entropy_score` | Mean variability score across all slots | ≥ 0.65 |
| `fallback_rate` | % of slots requiring fallback provider | ≤ 15% |
| `style_diversity_index` | Unique styles / total slots | ≥ 0.6 |
| `provider_concentration` | Max % from single provider per article | ≤ 50% |
| `semantic_alignment_avg` | Mean alignment score across slots | ≥ 0.7 |
| `cost_per_article` | Total image cost per job | ≤ budget threshold |
| `history_collision_rate` | % of selections matching recent usage | ≤ 5% |

Metrics emitted to `omniseen_metrics_60s` via `metrics-collector`.

---

## 11. Project Location

```
/skills/image-strategy-agent/image-variability-engine.md
```

### Supabase Tables Required

```
omniseen_image_usage_history
omniseen_image_entropy_log
```

### Event Bus Topics

```
Publishes: omniseen.skill.lifecycle
Reads:     omniseen.system.state_changed (for governor state awareness)
```

---

## Error Codes

| Code | Meaning |
|---|---|
| `IVE-001` | placement_directives schema invalid |
| `IVE-002` | usage_history unavailable — partial cache used |
| `IVE-003` | Entropy threshold not met after max retries |
| `IVE-004` | All providers exhausted — placeholder emitted |
| `IVE-005` | Cost budget exceeded — tier downgrade applied |
| `IVE-006` | Supabase history persistence failure |
