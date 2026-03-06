---
id: health-monitor
layer: 1
type: observability
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - system-state-governor
blocks: []
tags: [observability, health, heartbeat, liveness, readiness, layer-1]
---

# health-monitor

> **Layer 1 — Observability Operator**
> Primary liveness authority for all OmniSeen agents. Collects heartbeats, runs liveness and readiness probes, and reports agent health status to the system-state-governor.

---

## Purpose

The `health-monitor` is the first Observability operator instantiated after Layer 0. It establishes continuous visibility into the operational state of every registered agent. It does not make governance decisions — it supplies the governor with the health data required to make them.

All other Layer 1 operators depend on the liveness data produced by this agent.

---

## Responsibilities

- Collect and validate periodic heartbeats from all registered agents
- Execute liveness probes (is the agent alive?)
- Execute readiness probes (is the agent ready to accept work?)
- Detect missed heartbeats and escalate to `system-state-governor`
- Maintain a live health table per agent
- Emit health-change events to the event bus
- Persist health snapshots to Supabase

---

## Health Check Types

| Type | Question | Failure Action |
|---|---|---|
| **Heartbeat** | Is the agent sending signals? | Mark `UNRESPONSIVE` after 3 misses |
| **Liveness** | Is the agent process alive? | Report `CRITICAL` failure to governor |
| **Readiness** | Is the agent ready to serve? | Mark `DEGRADED`; block work routing to agent |

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `heartbeat` | `event` | Any agent | ✅ | Periodic liveness signal |
| `agent_registered` | `event` | system-state-governor | ✅ | Triggers probe schedule creation for new agent |
| `agent_deregistered` | `event` | system-state-governor | ✅ | Removes agent from probe schedule |
| `probe_config` | `object` | system-state-governor | ⚠️ | Override for probe intervals per agent |
| `manual_probe_request` | `event` | Operator | ⚠️ | Force immediate probe on specific agent |

### `heartbeat` Schema

```json
{
  "agent_id": "string",
  "timestamp": "ISO8601",
  "status": "HEALTHY | DEGRADED | BUSY",
  "metadata": "object | null"
}
```

### `probe_config` Schema

```json
{
  "agent_id": "string",
  "heartbeat_interval_ms": "integer",
  "liveness_probe_interval_ms": "integer",
  "readiness_probe_interval_ms": "integer",
  "miss_threshold": "integer"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `health_status_update` | `event` | system-state-governor | Agent health change notification |
| `health_table_snapshot` | `object` | Supabase | Full health table on any status change |
| `liveness_event` | `event` | event-logger | Structured log of every probe result |
| `missed_heartbeat_report` | `object` | system-state-governor | Escalation after miss threshold exceeded |
| `readiness_change_event` | `event` | system-state-governor | Agent readiness state changed |

### `health_status_update` Schema

```json
{
  "agent_id": "string",
  "previous_status": "string | null",
  "current_status": "HEALTHY | DEGRADED | UNRESPONSIVE | HALTED",
  "probe_type": "HEARTBEAT | LIVENESS | READINESS",
  "timestamp": "ISO8601",
  "consecutive_misses": "integer",
  "metadata": "object | null"
}
```

### `missed_heartbeat_report` Schema

```json
{
  "agent_id": "string",
  "severity": "MEDIUM | HIGH | CRITICAL",
  "consecutive_misses": "integer",
  "last_seen": "ISO8601 | null",
  "critical_agent": "boolean",
  "timestamp": "ISO8601"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `AGENT_REGISTERED` | `agent_registered` event received | Create probe schedule for agent |
| `HEARTBEAT_RECEIVED` | Valid heartbeat arrives | Reset miss counter; update health table |
| `HEARTBEAT_MISSED` | No heartbeat within interval window | Increment miss counter |
| `MISS_THRESHOLD_EXCEEDED` | `consecutive_misses >= miss_threshold` | Emit `missed_heartbeat_report` to governor |
| `LIVENESS_FAIL` | Liveness probe returns non-200 or timeout | Emit `health_status_update` with `UNRESPONSIVE` |
| `READINESS_FAIL` | Readiness probe returns not-ready | Emit `readiness_change_event` with `DEGRADED` |
| `READINESS_RESTORED` | Readiness probe returns ready after failure | Emit `readiness_change_event` with `HEALTHY` |
| `AGENT_DEREGISTERED` | `agent_deregistered` event received | Remove probe schedule; clear health table entry |
| `MANUAL_PROBE` | `manual_probe_request` received | Execute immediate liveness + readiness probe |

---

## Default Probe Configuration

| Parameter | Default Value |
|---|---|
| `heartbeat_interval_ms` | `15000` (15s) |
| `liveness_probe_interval_ms` | `30000` (30s) |
| `readiness_probe_interval_ms` | `30000` (30s) |
| `miss_threshold` | `3` consecutive misses |
| `critical_agent_miss_threshold` | `2` consecutive misses |

---

## Severity Escalation Rules

| Misses | Agent Critical | Severity Emitted |
|---|---|---|
| 1 | any | `LOW` (internal log only) |
| 2 | `false` | `MEDIUM` |
| 2 | `true` | `HIGH` |
| 3+ | `false` | `HIGH` |
| 3+ | `true` | `CRITICAL` |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Supabase unavailable | Buffer health snapshots in memory (max 500 entries); retry flush every 60s |
| Agent health_endpoint unreachable | Treat as liveness failure; apply standard miss escalation |
| Event bus unavailable | Queue outbound events in memory; retry every 10s; alert governor after 3 failures |
| probe_config missing for agent | Apply default probe configuration |
| health-monitor itself crashes | governor detects via self-heartbeat absence; escalates to `CRITICAL` immediately |

---

## Health Table Structure (per agent)

```json
{
  "agent_id": "string",
  "layer": "integer",
  "current_status": "HEALTHY | DEGRADED | UNRESPONSIVE | HALTED",
  "liveness": "PASS | FAIL | UNKNOWN",
  "readiness": "READY | NOT_READY | UNKNOWN",
  "consecutive_misses": "integer",
  "last_heartbeat": "ISO8601 | null",
  "last_liveness_probe": "ISO8601 | null",
  "last_readiness_probe": "ISO8601 | null",
  "probe_config": "object"
}
```

---

## Persistence

| Data | Store | Table | Frequency |
|---|---|---|---|
| Health table | Supabase | `omniseen_agent_health` | On every status change |
| Probe results | Supabase | `omniseen_probe_results` | Every probe execution |
| Missed heartbeat reports | Supabase | `omniseen_health_escalations` | On every escalation |
| Health snapshots | Supabase | `omniseen_health_snapshots` | Every 60s + on status change |

---

## Boot Sequence (Self)

```
1. Receive layer_activation_signal from system-state-governor
2. Self-register with governor (agent_registration payload)
3. Subscribe to omniseen.agent.registered event topic
4. Subscribe to omniseen.agent.deregistered event topic
5. Load existing agent registry from governor
6. Create probe schedule for every currently registered agent
7. Begin heartbeat collection loop
8. Begin liveness probe loop
9. Begin readiness probe loop
10. Emit self-heartbeat to governor
11. Set own status → HEALTHY
```

---

## Interfaces

### Supabase Edge Functions

```
POST /functions/v1/health-monitor/heartbeat
POST /functions/v1/health-monitor/probe        [manual trigger]
GET  /functions/v1/health-monitor/table        [full health table]
GET  /functions/v1/health-monitor/agent/:id    [single agent health]
```

### Event Bus Subscriptions

```
omniseen.agent.registered        → create probe schedule
omniseen.agent.deregistered      → remove probe schedule
```

### Event Bus Publications

```
omniseen.health.status_changed
omniseen.health.heartbeat_missed
omniseen.health.liveness_failed
omniseen.health.readiness_changed
```

---

## Self-Registration Payload

```json
{
  "agent_id": "health-monitor",
  "layer": 1,
  "type": "observability",
  "version": "1.0.0",
  "capabilities": [
    "heartbeat-collection",
    "liveness-probing",
    "readiness-probing",
    "health-table-management",
    "miss-escalation"
  ],
  "health_endpoint": "/functions/v1/health-monitor/agent/health-monitor",
  "critical": true
}
```

---

## Constraints

- Must be the **first Layer 1 agent** to complete boot and self-register.
- All other Layer 1 agents depend on `health-monitor` being `HEALTHY` before initializing.
- Does **not** make governance decisions — reports only.
- Does **not** restart or heal agents — escalates to `system-state-governor`.
- Must monitor **itself** via self-heartbeat emission every `heartbeat_interval_ms`.

---

## Error Codes

| Code | Meaning |
|---|---|
| `HM-001` | Probe schedule creation failed — agent not in registry |
| `HM-002` | Health endpoint unreachable during liveness probe |
| `HM-003` | Heartbeat payload schema invalid — rejected |
| `HM-004` | Supabase flush failed — buffering active |
| `HM-005` | Event bus publish failed — queuing active |
| `HM-006` | Miss threshold exceeded for critical agent |
| `HM-007` | Self-heartbeat emission failure |
