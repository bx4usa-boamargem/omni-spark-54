---
id: alert-dispatcher
layer: 1
type: observability
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - system-state-governor
  - health-monitor
  - metrics-collector
blocks: []
tags: [observability, alerting, anomaly, escalation, dispatch, layer-1]
---

# alert-dispatcher

> **Layer 1 — Observability Operator**
> Anomaly evaluation and alert routing engine for the OmniSeen OS. Consumes signals from `health-monitor` and `metrics-collector`, evaluates alert rules, and dispatches structured alerts to `system-state-governor` and registered notification targets.

---

## Purpose

The `alert-dispatcher` is the final Layer 1 operator. It closes the observability loop by converting raw health signals and metric anomalies into actionable, deduplicated, routed alerts. It does not heal systems — it ensures the right authority receives the right information at the right time.

---

## Responsibilities

- Evaluate incoming health and metric signals against a defined alert rule set
- Deduplicate and suppress redundant alerts (flap prevention)
- Route alerts to `system-state-governor` based on severity
- Maintain alert state (FIRING, RESOLVED, SUPPRESSED)
- Persist alert history to Supabase
- Emit alert lifecycle events to `event-logger`

---

## Alert Severity Levels

| Level | Meaning | Governor Action Triggered |
|---|---|---|
| `INFO` | Noteworthy but non-actionable | Log only |
| `WARNING` | Degradation risk detected | Emit to governor; no state change |
| `HIGH` | Active degradation confirmed | Emit to governor; may trigger `DEGRADED` |
| `CRITICAL` | System integrity at risk | Emit to governor; may trigger `RECOVERY` or `HALTED` |

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `health_status_update` | `event` | health-monitor | ✅ | Agent health state changes |
| `missed_heartbeat_report` | `object` | health-monitor | ✅ | Escalation from heartbeat miss |
| `anomaly_signal` | `event` | metrics-collector | ✅ | Metric deviation signal |
| `current_metrics` | `object` | metrics-collector | ✅ | Live metric feed for threshold rules |
| `alert_rule_update` | `object` | system-state-governor | ⚠️ | Runtime rule modification |
| `suppression_command` | `object` | Operator | ⚠️ | Suppress specific alert for a duration |

### `alert_rule` Schema

```json
{
  "rule_id": "string",
  "name": "string",
  "condition_type": "HEALTH_STATUS | METRIC_THRESHOLD | ANOMALY_SIGNAL | MISS_COUNT",
  "agent_filter": ["string"] ,
  "metric_name": "string | null",
  "threshold_value": "number | null",
  "comparator": "GT | LT | GTE | LTE | EQ | null",
  "severity": "INFO | WARNING | HIGH | CRITICAL",
  "flap_window_seconds": "integer",
  "suppression_window_seconds": "integer",
  "enabled": "boolean"
}
```

### `suppression_command` Schema

```json
{
  "rule_id": "string | null",
  "agent_id": "string | null",
  "duration_seconds": "integer",
  "reason": "string",
  "authorized_by": "string"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `alert` | `object` | system-state-governor | Structured alert with severity and context |
| `alert_resolved` | `event` | system-state-governor | Alert condition cleared notification |
| `alert_lifecycle_event` | `event` | event-logger | Full alert state change for audit trail |
| `dispatcher_heartbeat` | `event` | health-monitor | Self-health signal |

### `alert` Schema

```json
{
  "alert_id": "string (uuid)",
  "rule_id": "string",
  "rule_name": "string",
  "severity": "INFO | WARNING | HIGH | CRITICAL",
  "state": "FIRING | RESOLVED | SUPPRESSED",
  "agent_id": "string | null",
  "metric_name": "string | null",
  "trigger_value": "number | string | null",
  "threshold_value": "number | null",
  "message": "string",
  "fired_at": "ISO8601",
  "resolved_at": "ISO8601 | null",
  "suppressed_until": "ISO8601 | null",
  "context": "object | null"
}
```

---

## Default Alert Rules

| Rule ID | Condition | Severity |
|---|---|---|
| `AR-001` | Any critical agent → `UNRESPONSIVE` | `CRITICAL` |
| `AR-002` | Any non-critical agent → `UNRESPONSIVE` | `HIGH` |
| `AR-003` | `system.error_rate` > 10% over 60s | `HIGH` |
| `AR-004` | `system.error_rate` > 25% over 60s | `CRITICAL` |
| `AR-005` | `system.agent_availability` < 80% | `HIGH` |
| `AR-006` | `system.agent_availability` < 60% | `CRITICAL` |
| `AR-007` | Anomaly signal with deviation > 40% on any metric | `WARNING` |
| `AR-008` | Anomaly signal with deviation > 40% on critical metric | `HIGH` |
| `AR-009` | `event-logger` buffer > 70% capacity | `WARNING` |
| `AR-010` | Any agent misses > 2 consecutive heartbeats (critical) | `CRITICAL` |
| `AR-011` | Any agent misses > 3 consecutive heartbeats (non-critical) | `HIGH` |
| `AR-012` | `metrics-collector` anomaly detection suspended > 10m | `WARNING` |

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `HEALTH_SIGNAL_RECEIVED` | `health_status_update` arrives | Evaluate against health-based rules |
| `MISS_REPORT_RECEIVED` | `missed_heartbeat_report` arrives | Evaluate against miss-count rules |
| `ANOMALY_SIGNAL_RECEIVED` | `anomaly_signal` arrives | Evaluate against anomaly rules |
| `METRIC_THRESHOLD_CHECK` | Every 60s on `current_metrics` | Evaluate threshold-based rules |
| `ALERT_CONDITION_CLEARED` | Signal indicates recovery | Transition alert to RESOLVED; emit `alert_resolved` |
| `FLAP_DETECTED` | Alert fires/resolves > 3x in `flap_window_seconds` | Suppress for `suppression_window_seconds`; emit INFO |
| `SUPPRESSION_COMMAND` | Operator suppression received | Mark alert SUPPRESSED for duration |
| `SUPPRESSION_EXPIRED` | Suppression window elapses | Resume evaluation for suppressed rule |

---

## Flap Prevention

```
If an alert transitions FIRING → RESOLVED → FIRING more than 3 times
within flap_window_seconds (default: 300s):
  - Mark alert as SUPPRESSED for suppression_window_seconds (default: 600s)
  - Emit INFO alert to governor: "Flapping detected on rule {rule_id}"
  - Log full flap history to event-logger
  - Resume normal evaluation after suppression expires
```

---

## Alert Deduplication

```
Before firing a new alert:
  - Check if an alert with same rule_id + agent_id is already FIRING
  - If yes: update context, do NOT re-emit to governor
  - If no: emit new alert, persist to Supabase
```

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Supabase unavailable | Buffer alert records in memory; flush on reconnect |
| metrics-collector unavailable | Suspend metric-threshold rules; continue health-based rules; emit WARNING |
| health-monitor unavailable | Emit CRITICAL alert to governor immediately; suspend health-based rules |
| Governor unreachable | Buffer CRITICAL/HIGH alerts in memory; retry every 10s; log all attempts |
| Rule set empty or corrupt | Load default alert rules; emit WARNING to event-logger |
| All rules suppressed simultaneously | Emit CRITICAL override to governor regardless of suppression |

---

## Persistence

| Data | Store | Table | Retention |
|---|---|---|---|
| Active alerts | Supabase | `omniseen_alerts_active` | Until resolved |
| Alert history | Supabase | `omniseen_alerts_history` | 90 days |
| Alert rules | Supabase | `omniseen_alert_rules` | Permanent |
| Suppression log | Supabase | `omniseen_alert_suppressions` | 30 days |

---

## Boot Sequence (Self)

```
1. Receive layer_activation_signal (gate: health-monitor HEALTHY + metrics-collector HEALTHY)
2. Self-register with system-state-governor
3. Connect to Supabase; load alert rules from omniseen_alert_rules
4. If no rules found: load default rule set; persist to Supabase
5. Load active alerts from omniseen_alerts_active (resume state)
6. Subscribe to health-monitor event bus topics
7. Subscribe to metrics-collector event bus topics
8. Start 60s metric threshold evaluation timer
9. Emit self-heartbeat to health-monitor
10. Set own status → HEALTHY
```

---

## Interfaces

### Supabase Edge Functions

```
GET  /functions/v1/alert-dispatcher/active       [current active alerts]
GET  /functions/v1/alert-dispatcher/history      [alert history query]
POST /functions/v1/alert-dispatcher/suppress     [operator suppression]
POST /functions/v1/alert-dispatcher/rules        [rule management]
GET  /functions/v1/alert-dispatcher/rules        [list all rules]
```

### Event Bus Subscriptions

```
omniseen.health.status_changed
omniseen.health.heartbeat_missed
omniseen.health.liveness_failed
omniseen.metrics.anomaly_detected
omniseen.metrics.snapshot_persisted
```

### Event Bus Publications

```
omniseen.alert.fired
omniseen.alert.resolved
omniseen.alert.suppressed
omniseen.alert.flap_detected
```

---

## Self-Registration Payload

```json
{
  "agent_id": "alert-dispatcher",
  "layer": 1,
  "type": "observability",
  "version": "1.0.0",
  "capabilities": [
    "alert-rule-evaluation",
    "alert-deduplication",
    "flap-prevention",
    "alert-routing",
    "suppression-management",
    "alert-lifecycle-tracking"
  ],
  "health_endpoint": "/functions/v1/alert-dispatcher/active",
  "critical": true
}
```

---

## Constraints

- Does **not** perform healing or governance actions — routes alerts only.
- CRITICAL alerts to `system-state-governor` must be delivered with **zero suppression** regardless of flap state.
- Alert history is **immutable** after persistence.
- Must be the **last Layer 1 agent** to complete boot.
- Layer 1 is only fully `HEALTHY` when all 4 operators are registered and healthy.

---

## Error Codes

| Code | Meaning |
|---|---|
| `AD-001` | Alert rule load failure at boot — using defaults |
| `AD-002` | Governor unreachable — buffering CRITICAL/HIGH alerts |
| `AD-003` | Supabase write failure — buffering active |
| `AD-004` | Suppression command rejected — invalid schema or unauthorized |
| `AD-005` | Flap detected — alert suppressed |
| `AD-006` | All rules suppressed — CRITICAL override emitted |
| `AD-007` | metrics-collector unavailable — metric-threshold rules suspended |
