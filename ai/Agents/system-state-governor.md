---
id: system-state-governor
layer: 0
type: governance
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on: []
blocks: ["layer-1", "layer-2", "layer-3"]
tags: [governance, system-state, orchestration, boot-protocol]
---

# system-state-governor

> **Layer 0 — Governance Operator**
> Root authority of the OmniSeen Operating System. No other agent may be instantiated without this operator being in a healthy state.

---

## Purpose

The `system-state-governor` is the single source of truth for system lifecycle management. It owns the global state machine of the OmniSeen OS, enforces boot sequencing, authorizes layer transitions, and maintains a persistent registry of all active agents and their operational status.

It does not generate content. It does not perform SEO operations. It governs.

---

## Responsibilities

- Maintain the global system state (`BOOTING`, `DEGRADED`, `HEALTHY`, `HALTED`, `RECOVERY`)
- Enforce the Boot Protocol Sequencial (Layer 0 → 1 → 2 → 3)
- Gate layer activation based on readiness checks
- Register and deregister agents in the Agent Registry
- Emit system-wide lifecycle events
- Detect and escalate unrecoverable failures
- Persist state snapshots to Supabase for durability

---

## State Machine

```
BOOTING
  └─► HEALTHY         (all layer-0 checks pass)
  └─► HALTED          (critical dependency failure at boot)

HEALTHY
  └─► DEGRADED        (one or more non-critical agents fail)
  └─► RECOVERY        (auto-heal triggered)
  └─► HALTED          (unrecoverable failure detected)

DEGRADED
  └─► RECOVERY        (self-heal initiated)
  └─► HALTED          (degradation exceeds threshold)

RECOVERY
  └─► HEALTHY         (recovery successful)
  └─► HALTED          (recovery failed after max retries)

HALTED
  └─► BOOTING         (manual restart authorized)
```

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `boot_signal` | `event` | Runtime / CI | ✅ | Triggers the boot sequence |
| `agent_registration` | `object` | Any agent | ✅ | Agent self-registration payload |
| `heartbeat` | `event` | All agents | ✅ | Periodic liveness signal from each agent |
| `layer_ready_signal` | `event` | Layer agents | ✅ | Emitted when all agents in a layer pass readiness |
| `failure_report` | `object` | Any agent | ⚠️ | Structured failure payload with severity level |
| `manual_override` | `object` | Operator | ⚠️ | Administrative command (restart, halt, force-heal) |

### `agent_registration` Schema

```json
{
  "agent_id": "string",
  "layer": "integer (0-3)",
  "type": "string",
  "version": "string",
  "capabilities": ["string"],
  "health_endpoint": "string | null",
  "critical": "boolean"
}
```

### `failure_report` Schema

```json
{
  "agent_id": "string",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "error_code": "string",
  "message": "string",
  "timestamp": "ISO8601",
  "context": "object | null"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `system_state` | `string` | All agents / Supabase | Current global state |
| `layer_activation_signal` | `event` | Layer N+1 agents | Authorizes the next layer to initialize |
| `agent_registry_snapshot` | `object` | Supabase | Full registry dump on state change |
| `lifecycle_event` | `event` | Observability agents (Layer 1) | Structured event for all state transitions |
| `halt_command` | `event` | All agents | Ordered shutdown broadcast |
| `recovery_command` | `event` | Target agent | Directed heal instruction |

### `lifecycle_event` Schema

```json
{
  "event_type": "STATE_TRANSITION | AGENT_REGISTERED | AGENT_DEREGISTERED | LAYER_ACTIVATED | FAILURE_ESCALATED",
  "from_state": "string | null",
  "to_state": "string",
  "layer_affected": "integer | null",
  "agent_id": "string | null",
  "timestamp": "ISO8601",
  "metadata": "object | null"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `BOOT` | `boot_signal` received | Initialize state machine → `BOOTING` |
| `LAYER_0_READY` | Self-checks pass | Transition to `HEALTHY`, emit `layer_activation_signal` for Layer 1 |
| `LAYER_N_READY` | All agents in Layer N registered + healthy | Emit `layer_activation_signal` for Layer N+1 |
| `HEARTBEAT_MISS` | Agent misses >3 consecutive heartbeats | Mark agent `UNRESPONSIVE`, evaluate criticality |
| `CRITICAL_FAILURE` | `failure_report` with `severity: CRITICAL` | Transition to `HALTED` or `RECOVERY` based on policy |
| `NON_CRITICAL_FAILURE` | `failure_report` with `severity: LOW/MEDIUM` | Transition to `DEGRADED`, log event |
| `RECOVERY_SUCCESS` | Recovery agent confirms resolution | Transition to `HEALTHY` |
| `RECOVERY_FAILURE` | Max retries exceeded | Transition to `HALTED` |
| `MANUAL_OVERRIDE` | Operator command received | Execute override (halt / restart / force-state) |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Supabase unavailable at boot | Use in-memory state; retry persistence every 30s; emit `DEGRADED` |
| Agent registration timeout (>60s) | Mark agent as `MISSING`; block layer activation if agent is `critical: true` |
| Heartbeat system failure | Transition to `DEGRADED`; alert observability layer; do NOT halt |
| Recovery agent unreachable | Attempt 3 self-restart cycles; if unsuccessful, transition to `HALTED` |
| Manual override with invalid auth | Reject command; log unauthorized access attempt; do NOT change state |
| Circular dependency detected at boot | Abort boot sequence; emit structured error; transition to `HALTED` |

---

## Agent Registry

The governor maintains a live registry with the following structure per agent:

```json
{
  "agent_id": "string",
  "layer": "integer",
  "status": "INITIALIZING | HEALTHY | DEGRADED | UNRESPONSIVE | HALTED",
  "critical": "boolean",
  "registered_at": "ISO8601",
  "last_heartbeat": "ISO8601 | null",
  "failure_count": "integer",
  "version": "string"
}
```

---

## Persistence

| Data | Store | Table / Key | Frequency |
|---|---|---|---|
| Global system state | Supabase | `omniseen_system_state` | On every state transition |
| Agent registry | Supabase | `omniseen_agent_registry` | On registration / deregistration / status change |
| Lifecycle events | Supabase | `omniseen_lifecycle_events` | On every event emission |
| State snapshots | Supabase | `omniseen_state_snapshots` | Every 5 minutes + on state transition |

---

## Boot Sequence (Self)

```
1. Receive boot_signal
2. Set state → BOOTING
3. Initialize in-memory state machine
4. Connect to Supabase → if fail, use in-memory fallback
5. Load last known state from omniseen_state_snapshots
6. Run self-integrity checks:
   a. State machine validity
   b. Registry schema integrity
   c. Event bus connectivity
7. If all checks pass → set state → HEALTHY
8. Emit layer_activation_signal for Layer 1
9. Begin accepting agent_registration and heartbeat inputs
```

---

## Interfaces

### Supabase Edge Function

```
POST /functions/v1/governor/boot
POST /functions/v1/governor/register
POST /functions/v1/governor/heartbeat
POST /functions/v1/governor/report-failure
GET  /functions/v1/governor/state
GET  /functions/v1/governor/registry
POST /functions/v1/governor/override  [operator-auth required]
```

### Event Bus Topics (internal)

```
omniseen.system.state_changed
omniseen.system.layer_activated
omniseen.agent.registered
omniseen.agent.deregistered
omniseen.agent.failure_reported
omniseen.system.halted
omniseen.system.recovery_initiated
```

---

## Constraints

- This operator has **no upstream dependencies** — it is the root node.
- It **must be fully healthy** before any Layer 1 agent is instantiated.
- It **cannot be restarted by another agent** — only by a manual operator signal or the runtime environment.
- It **does not perform business logic** of any kind (no SEO, no content, no routing).
- All other operators must treat the governor's emitted state as **authoritative and immutable** within a given tick.

---

## Error Codes

| Code | Meaning |
|---|---|
| `GOV-001` | Boot signal received but state machine already active |
| `GOV-002` | Agent registration rejected — invalid schema |
| `GOV-003` | Layer activation blocked — previous layer not fully healthy |
| `GOV-004` | Heartbeat store unavailable |
| `GOV-005` | Supabase persistence failure |
| `GOV-006` | Manual override rejected — unauthorized |
| `GOV-007` | Circular dependency detected in boot sequence |
| `GOV-008` | Recovery max retries exceeded — transitioning to HALTED |

---

## Notes

- This operator is the **only Layer 0 agent** in the OmniSeen OS.
- Layer 1 agents (Observability) may only start after `system-state-governor` emits `layer_activation_signal`.
- All architectural decisions about system health flow through this operator.
- Future versions may support **multi-region governor consensus** via Supabase Realtime.
