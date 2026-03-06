---
id: metrics-collector
layer: 1
type: observability
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - system-state-governor
  - health-monitor
  - event-logger
blocks: []
tags: [observability, metrics, performance, throughput, latency, layer-1]
---

# metrics-collector

> **Layer 1 — Observability Operator**
> Operational telemetry engine for the OmniSeen OS. Collects, aggregates, and persists performance metrics across all agents. Provides the quantitative data layer that feeds the `alert-dispatcher`.

---

## Purpose

The `metrics-collector` transforms raw operational data — event rates, probe results, execution times, failure counts — into structured time-series metrics. It does not alert; it measures. The `alert-dispatcher` consumes its output to determine when system behavior deviates from baseline.

---

## Responsibilities

- Collect metrics from all registered agents (push and pull models)
- Derive system-level metrics from `health-monitor` and `event-logger` outputs
- Compute rolling aggregations (rate, average, percentiles, counts)
- Persist time-series data to Supabase
- Expose current metric snapshots to consuming agents
- Emit metric anomaly signals to `alert-dispatcher`

---

## Metric Categories

| Category | Examples |
|---|---|
| **Latency** | Agent response time, probe round-trip time, event ingestion latency |
| **Throughput** | Events per second, tasks per minute per agent |
| **Error Rate** | Failures per agent per window, dead-letter rate |
| **Availability** | Uptime %, consecutive healthy windows per agent |
| **Saturation** | In-memory buffer fill %, queue depth |
| **System** | Active agent count, layer health score, governor state transitions/hour |

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `metric_push` | `object` | Any agent | ✅ | Agent self-reported metric payload |
| `health_table_snapshot` | `object` | health-monitor | ✅ | Used to derive availability metrics |
| `persisted_event` | `event` | event-logger | ✅ | Used to derive event rate + error rate metrics |
| `metric_pull_config` | `object` | system-state-governor | ⚠️ | Configures pull-based collection per agent |
| `metric_query` | `object` | Any agent | ⚠️ | Ad-hoc metric query request |

### `metric_push` Schema

```json
{
  "agent_id": "string",
  "metric_name": "string",
  "value": "number",
  "unit": "string",
  "timestamp": "ISO8601",
  "dimensions": "object | null",
  "aggregation_hint": "SUM | AVG | MAX | MIN | LAST | null"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `metric_snapshot` | `object` | Supabase | Aggregated metric record per window |
| `current_metrics` | `object` | alert-dispatcher | Live metric feed for threshold evaluation |
| `metric_query_result` | `object` | Requesting agent | Response to ad-hoc queries |
| `anomaly_signal` | `event` | alert-dispatcher | Pre-computed deviation signal |
| `collector_heartbeat` | `event` | health-monitor | Self-health signal |

### `metric_snapshot` Schema

```json
{
  "metric_id": "string (uuid)",
  "agent_id": "string | __system__",
  "metric_name": "string",
  "window_start": "ISO8601",
  "window_end": "ISO8601",
  "window_seconds": "integer",
  "value_avg": "number | null",
  "value_min": "number | null",
  "value_max": "number | null",
  "value_p50": "number | null",
  "value_p95": "number | null",
  "value_p99": "number | null",
  "value_sum": "number | null",
  "sample_count": "integer",
  "unit": "string",
  "dimensions": "object | null"
}
```

### `anomaly_signal` Schema

```json
{
  "agent_id": "string",
  "metric_name": "string",
  "current_value": "number",
  "baseline_value": "number",
  "deviation_pct": "number",
  "direction": "HIGH | LOW",
  "window_seconds": "integer",
  "timestamp": "ISO8601"
}
```

---

## Aggregation Windows

| Window | Use |
|---|---|
| `60s` | Real-time alerting feed |
| `300s` (5m) | Operational dashboards |
| `3600s` (1h) | Trend analysis |
| `86400s` (24h) | Daily health reports |

---

## Core System Metrics (auto-derived)

| Metric Name | Source | Derivation |
|---|---|---|
| `system.event_rate` | event-logger | Events ingested per 60s window |
| `system.error_rate` | event-logger | Dead-letter events / total events per window |
| `system.agent_availability` | health-monitor | % of agents in HEALTHY state per window |
| `system.layer_health_score` | health-monitor | Weighted health score per layer (0–100) |
| `agent.heartbeat_miss_rate` | health-monitor | Missed heartbeats / expected per window |
| `agent.readiness_uptime` | health-monitor | % of window agent was in READY state |

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `METRIC_PUSH_RECEIVED` | `metric_push` payload arrives | Validate → buffer → aggregate on window close |
| `WINDOW_CLOSE` | Aggregation window elapses | Compute aggregations → persist → emit to alert-dispatcher |
| `HEALTH_SNAPSHOT_RECEIVED` | health-monitor snapshot arrives | Derive availability + readiness metrics |
| `EVENT_STREAM_TICK` | event-logger emits persisted_event | Increment event rate counter |
| `ANOMALY_DETECTED` | Deviation > threshold vs baseline | Emit `anomaly_signal` to alert-dispatcher |
| `METRIC_QUERY_RECEIVED` | `metric_query` arrives | Execute query against Supabase; return results |
| `PULL_INTERVAL_ELAPSED` | Per-agent pull schedule fires | Request metric payload from agent endpoint |

---

## Anomaly Detection (baseline deviation)

```
For each metric, maintain a rolling baseline over the last 24h window.
On each 60s window close:
  - Compute current_value
  - Compare against baseline_value
  - If deviation_pct > anomaly_threshold → emit anomaly_signal

Default anomaly_threshold: 40% deviation
Critical metrics threshold: 20% deviation

Critical metrics:
  - system.error_rate
  - agent.heartbeat_miss_rate
  - system.agent_availability
```

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Supabase unavailable | Buffer metric snapshots in memory (max 2,000 records); flush on reconnect |
| health-monitor unavailable | Suspend availability metric derivation; log gap; resume on reconnect |
| event-logger unavailable | Suspend event_rate + error_rate derivation; log gap |
| Agent pull endpoint unreachable | Skip pull cycle; increment `agent.pull_failure_count`; continue |
| Anomaly threshold misconfigured | Fall back to defaults; emit config error to event-logger |

---

## Persistence

| Data | Store | Table | Retention |
|---|---|---|---|
| Metric snapshots (60s) | Supabase | `omniseen_metrics_60s` | 7 days |
| Metric snapshots (5m) | Supabase | `omniseen_metrics_5m` | 30 days |
| Metric snapshots (1h) | Supabase | `omniseen_metrics_1h` | 90 days |
| Metric snapshots (24h) | Supabase | `omniseen_metrics_24h` | 365 days |
| Anomaly signals | Supabase | `omniseen_anomaly_signals` | 90 days |

---

## Boot Sequence (Self)

```
1. Receive layer_activation_signal (gate: health-monitor HEALTHY + event-logger HEALTHY)
2. Self-register with system-state-governor
3. Connect to Supabase; verify metric tables exist
4. Load 24h baseline data from omniseen_metrics_60s
5. Subscribe to health-monitor health_table_snapshot events
6. Subscribe to event-logger persisted_event stream
7. Begin accepting metric_push submissions
8. Start aggregation window timers (60s, 5m, 1h, 24h)
9. Start pull collection schedules for registered agents
10. Emit self-heartbeat to health-monitor
11. Set own status → HEALTHY
```

---

## Interfaces

### Supabase Edge Functions

```
POST /functions/v1/metrics-collector/push       [metric push submission]
POST /functions/v1/metrics-collector/query      [ad-hoc metric query]
GET  /functions/v1/metrics-collector/snapshot   [current metric snapshot]
GET  /functions/v1/metrics-collector/agent/:id  [per-agent metrics]
```

### Event Bus Subscriptions

```
omniseen.health.status_changed
omniseen.logger.ingestion_error
omniseen.agent.registered
omniseen.agent.deregistered
```

### Event Bus Publications

```
omniseen.metrics.snapshot_persisted
omniseen.metrics.anomaly_detected
```

---

## Self-Registration Payload

```json
{
  "agent_id": "metrics-collector",
  "layer": 1,
  "type": "observability",
  "version": "1.0.0",
  "capabilities": [
    "metric-ingestion",
    "metric-aggregation",
    "time-series-persistence",
    "anomaly-detection",
    "metric-query"
  ],
  "health_endpoint": "/functions/v1/metrics-collector/snapshot",
  "critical": true
}
```

---

## Constraints

- Must not make governance or alerting decisions — measurement only.
- Anomaly signals are **inputs to** `alert-dispatcher`, not alerts themselves.
- Metric data is **append-only** — no retroactive modification.
- Must be `HEALTHY` before `alert-dispatcher` initializes.
- Baseline computation requires minimum **30 minutes** of data before anomaly detection activates.

---

## Error Codes

| Code | Meaning |
|---|---|
| `MC-001` | metric_push schema invalid — rejected |
| `MC-002` | Supabase write failure — buffering active |
| `MC-003` | Memory buffer capacity exceeded |
| `MC-004` | Aggregation window computation error |
| `MC-005` | Pull endpoint unreachable for agent |
| `MC-006` | Baseline data insufficient — anomaly detection suspended |
| `MC-007` | Anomaly threshold configuration invalid — using defaults |
