---
id: system-anomaly-predictor
agent: metrics-collector
layer: 1
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - metrics-collector
  - omniseen_metrics_1h (Supabase)
  - omniseen_metrics_24h (Supabase)
  - omniseen_lifecycle_events (Supabase)
auto_heal: true
governor_reporting: true
risk_level: HIGH
tags: [anomaly-prediction, failure-prevention, latency, trends, observability, metrics-collector]
project_location: /skills/metrics-collector/system-anomaly-predictor.md
---

# system-anomaly-predictor

> **metrics-collector / Skill**
> Predicts system failures before they occur. Analyzes historical metrics, job trends, and latency patterns to identify degradation trajectories — emitting pre-failure alerts that allow the system to self-correct before user impact.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `system-anomaly-predictor` |
| Parent Agent | `metrics-collector` |
| Layer | 1 — Observability |
| Risk Level | HIGH |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Reactive monitoring catches failures after they occur. Predictive monitoring prevents them. This skill analyzes trend trajectories across system metrics to detect the signatures of impending failure — rising latency curves, increasing error rates, queue depth growth, memory pressure patterns — and emits warnings before thresholds are breached. It transforms OmniSeen from a reactive system into a proactive one.

---

## 3. Responsibilities

- Analyze rolling metric windows for trend trajectory (improving / stable / degrading)
- Detect pre-failure signatures across latency, error rate, queue depth, and availability
- Compute time-to-breach estimates for metrics on degrading trajectories
- Emit predictive alerts before hard thresholds are reached
- Identify correlated metric degradations (multi-signal anomalies)
- Feed predictions into `alert-dispatcher` as pre-emptive signals
- Maintain prediction accuracy log for model calibration

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `metric_snapshots_1h` | `object` | Supabase `omniseen_metrics_1h` | ✅ | Hourly metric history (last 72h) |
| `metric_snapshots_24h` | `object` | Supabase `omniseen_metrics_24h` | ✅ | Daily metric history (last 30d) |
| `lifecycle_events` | `object` | Supabase `omniseen_lifecycle_events` | ✅ | System event history for correlation |
| `active_job_queue` | `object` | generation-orchestrator | ⚠️ | Current queue depth and job types |

### Monitored Metric Trajectories

```
agent.response_latency_ms        → rising trajectory = pre-overload
system.error_rate                → rising trajectory = degradation onset
job.queue_depth                  → rising without drain = backlog risk
agent.heartbeat_miss_rate        → rising = reliability degradation
event_logger.buffer_fill_pct     → approaching 100% = persistence risk
provider.latency_ms              → rising = external dependency strain
metrics-collector.ingest_lag_ms  → rising = observability degradation
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `prediction_report` | `object` | alert-dispatcher | Predictive alerts for degrading metrics |
| `trajectory_analysis` | `object` | metrics-collector core | Trend state per metric |
| `governor_event` | `event` | system-state-governor | Prediction results |

### `prediction_report` Schema

```json
{
  "generated_at": "ISO8601",
  "predictions": [
    {
      "metric_name": "string",
      "agent_id": "string | __system__",
      "current_value": "number",
      "trajectory": "IMPROVING | STABLE | DEGRADING | CRITICAL_TRAJECTORY",
      "trend_slope": "number",
      "estimated_breach_minutes": "integer | null",
      "confidence": "number (0-1)",
      "correlated_metrics": ["string"],
      "recommended_action": "string | null"
    }
  ],
  "critical_predictions_count": "integer",
  "analysis_window_hours": "integer"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Insufficient history for prediction | < 4h of metric data | Disable trajectory analysis; use threshold-only alerting |
| Metric data gap detected | Missing window in history | Interpolate gap; flag `interpolated: true` in prediction |
| False positive rate > 20% | Accuracy log analysis | Increase confidence threshold from 0.6 to 0.75 |
| All metrics showing CRITICAL_TRAJECTORY | Systemic signal | Emit immediate CRITICAL to governor; do not filter |
| Supabase metric read failure | Query timeout | Use in-memory recent metrics; flag `reduced_history` |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Analysis cycle initiated | `{skill_id, metrics_analyzed, window_hours}` |
| `skill.completed` | Predictions emitted | `{critical_predictions, degrading_metrics, stable_metrics}` |
| `prediction.critical` | CRITICAL_TRAJECTORY detected | `{metric_name, agent_id, estimated_breach_minutes, confidence}` |
| `skill.degraded` | Insufficient data | `{reason, fallback_mode}` |

---

## 8. Execution Flow

```
1. Load metric_snapshots_1h (last 72h) from Supabase
2. Load metric_snapshots_24h (last 30d) from Supabase
3. For each monitored metric:
   a. Compute linear trend slope over last 6h window
   b. Compute trend slope over last 24h window
   c. Compare slopes: if 6h slope > 24h slope → degrading trajectory
   d. Estimate time to breach = (threshold - current) / slope
   e. Assign trajectory label
   f. Set confidence based on data density and slope consistency
4. Detect correlated degradations (metrics degrading in same time window)
5. Filter predictions with confidence < 0.6
6. Compile prediction_report
7. Emit CRITICAL predictions directly to governor
8. Emit full report to alert-dispatcher
9. Log prediction accuracy against actuals (next cycle comparison)
10. Schedule next analysis cycle (default: every 15 min)
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| No metric history available | HIGH | Predictor suspended; threshold alerting only |
| Prediction model producing all false positives | MEDIUM | Auto-recalibrate confidence threshold |
| Multiple CRITICAL_TRAJECTORY simultaneously | CRITICAL | Immediate governor escalation; potential preemptive RECOVERY |
| Analysis cycle delayed > 30 min | HIGH | Alert governor; check metrics-collector health |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `prediction_accuracy_rate` | ≥ 80% (predictions that preceded actual failures) |
| `false_positive_rate` | ≤ 15% |
| `avg_lead_time_minutes` | ≥ 15 min before actual breach |
| `analysis_cycle_latency_ms` | ≤ 5,000ms |
| `critical_predictions_acted_on` | ≥ 90% result in preventive action |

---

## 11. Project Location

```
/skills/metrics-collector/system-anomaly-predictor.md
```

### Supabase Tables
```
omniseen_predictions_log
omniseen_prediction_accuracy
```

## Error Codes

| Code | Meaning |
|---|---|
| `SAP-001` | Insufficient metric history — fallback mode |
| `SAP-002` | Metric data gap — interpolation applied |
| `SAP-003` | False positive rate threshold exceeded |
| `SAP-004` | All metrics CRITICAL_TRAJECTORY — immediate escalation |
| `SAP-005` | Supabase read failure — in-memory fallback |
