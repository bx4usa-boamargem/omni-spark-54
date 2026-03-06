---
id: lead-intent-detector
agent: research-intelligence-agent
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - serp-intelligence-analyzer
  - omniseen_content_registry (Supabase)
  - CRM integration
auto_heal: true
governor_reporting: true
risk_level: MEDIUM
tags: [leads, intent, transactional, commercial, conversion, crm, research-intelligence-agent]
project_location: /skills/research-intelligence-agent/lead-intent-detector.md
---

# lead-intent-detector

> **research-intelligence-agent / Skill**
> Detects transactional and commercial intent signals within the OmniSeen content corpus and SERP landscape. Identifies conversion opportunities, flags high-value keyword targets, and feeds qualified signals into the CRM pipeline.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `lead-intent-detector` |
| Parent Agent | `research-intelligence-agent` |
| Layer | 3 — Production |
| Risk Level | MEDIUM |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Not all organic traffic has equal value. A user searching "best SEO tool for agencies" is far closer to a purchasing decision than one searching "what is SEO." This skill classifies every keyword and content piece by commercial and transactional intent intensity, identifies which pages in the OmniSeen corpus should carry conversion elements, and routes high-intent signals to the CRM pipeline for lead nurturing.

---

## 3. Responsibilities

- Classify all target keywords by intent type and commercial intensity score
- Detect transactional signals in keyword sets (pricing, comparison, "best", "hire", "buy")
- Flag content pieces that target high-commercial-intent keywords for CTA injection
- Identify search queries with strong conversion proximity (BOFU signals)
- Feed qualified high-intent keyword signals to CRM pipeline
- Recommend CTA type per intent level (form, demo request, free trial, contact)
- Monitor which published pages attract high-intent traffic patterns

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `research_brief` | `object` | research-intelligence-agent core | ✅ | Full keyword and intent data |
| `serp_analysis` | `object` | serp-intelligence-analyzer | ✅ | SERP intent classification |
| `content_registry` | `object` | Supabase | ⚠️ | Published pages for retroactive scoring |
| `crm_config` | `object` | system config | ⚠️ | CRM endpoint and lead schema |

### Intent Classification Tiers

```
TIER 1 — TOFU (Top of Funnel)
  Signals: educational, "what is", "how to", "guide"
  Commercial score: 0.0–0.3
  Action: informational content, no CTA required

TIER 2 — MOFU (Middle of Funnel)
  Signals: comparison, "vs", "review", "alternatives", "best"
  Commercial score: 0.3–0.7
  Action: soft CTA (newsletter, resource download)

TIER 3 — BOFU (Bottom of Funnel)
  Signals: "pricing", "hire", "buy", "agency", "cost", "free trial"
  Commercial score: 0.7–1.0
  Action: hard CTA (demo, contact, trial signup) + CRM signal
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `intent_classification` | `object` | research_brief + content_blueprint | Per-keyword intent scores and tiers |
| `conversion_recommendations` | `array` | content-architect (via orchestrator) | CTA type and placement per content piece |
| `crm_lead_signal` | `object` | CRM integration | High-intent keyword → lead pipeline entry |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `intent_classification` Schema

```json
{
  "keyword": "string",
  "intent_type": "INFORMATIONAL | NAVIGATIONAL | COMMERCIAL | TRANSACTIONAL",
  "funnel_tier": "TOFU | MOFU | BOFU",
  "commercial_intensity_score": "number (0-1)",
  "conversion_signals": ["string"],
  "recommended_cta_type": "NONE | SOFT | HARD",
  "recommended_cta": "string | null",
  "crm_qualified": "boolean"
}
```

### `crm_lead_signal` Schema

```json
{
  "signal_id": "string (uuid)",
  "keyword": "string",
  "url_slug": "string",
  "funnel_tier": "BOFU",
  "commercial_intensity_score": "number",
  "recommended_cta": "string",
  "estimated_monthly_searches": "integer | null",
  "created_at": "ISO8601"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| CRM endpoint unavailable | Connection failure | Buffer CRM signals locally; retry every 5 min |
| Classification confidence < 0.5 | Low score | Default to MOFU tier; flag for manual review |
| No BOFU signals detected | All keywords TOFU/MOFU | Log advisory; recommend keyword expansion toward commercial terms |
| Intent model failure | Classification error | Use keyword pattern matching as fallback classifier |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Activation | `{skill_id, job_id, keyword_count}` |
| `skill.completed` | Classification complete | `{job_id, bofu_signals, crm_qualified_count}` |
| `crm.signal_sent` | CRM signal dispatched | `{keyword, url_slug, commercial_score}` |
| `skill.degraded` | CRM unavailable | `{job_id, signals_buffered}` |

---

## 8. Execution Flow

```
1. Receive research_brief + serp_analysis
2. For each keyword in primary + secondary + semantic sets:
   a. Extract intent signals from keyword text
   b. Cross-reference with serp_analysis.dominant_intent
   c. Compute commercial_intensity_score
   d. Classify funnel_tier
   e. Assign recommended_cta_type
3. Flag BOFU keywords as crm_qualified: true
4. Compile intent_classification for all keywords
5. Generate conversion_recommendations per content piece
6. For each crm_qualified keyword:
   a. Create crm_lead_signal
   b. Dispatch to CRM endpoint
   c. If CRM unavailable → buffer locally
7. Emit governor_event: skill.completed
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| All keywords classified TOFU | LOW | Advisory; proceed; no CRM signals |
| CRM pipeline down > 30 min | MEDIUM | Buffer overflow risk; alert governor |
| Classification model unavailable | HIGH | Pattern-matching fallback; flag low confidence |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `bofu_keyword_rate` | ≥ 15% of analyzed keywords |
| `crm_signal_delivery_rate` | ≥ 98% |
| `classification_confidence_avg` | ≥ 0.75 |
| `conversion_recommendation_coverage` | 100% of BOFU content pieces |
| `crm_buffer_overflow_events` | 0 |

---

## 11. Project Location

```
/skills/research-intelligence-agent/lead-intent-detector.md
```

### Supabase Tables
```
omniseen_intent_classifications
omniseen_crm_signal_buffer
```

## Error Codes

| Code | Meaning |
|---|---|
| `LID-001` | CRM endpoint unavailable — buffering |
| `LID-002` | Classification confidence below threshold |
| `LID-003` | Intent model failure — pattern fallback used |
| `LID-004` | CRM buffer capacity exceeded |
