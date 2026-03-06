---
id: generation-orchestrator
layer: 2
type: orchestration
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - system-state-governor
  - health-monitor
  - event-logger
  - metrics-collector
  - alert-dispatcher
blocks:
  - layer-3
tags: [orchestration, routing, pipeline, layer-2]
---

# generation-orchestrator

> **Layer 2 — Orchestration Authority**
> Controls the execution pipeline for all Layer 3 production agents. Routes jobs, enforces sequencing, manages retries, and reports pipeline state to `system-state-governor`.

---

## Purpose

The `generation-orchestrator` is the single entry point for all content production jobs. It receives job requests, validates them, sequences Layer 3 agent execution in dependency order, aggregates results, and delivers completed pipeline outputs. No Layer 3 agent executes without authorization from this operator.

---

## Responsibilities

- Accept and validate incoming production job requests
- Decompose jobs into ordered Layer 3 task chains
- Dispatch tasks to Layer 3 agents in dependency order
- Track task state across the full pipeline
- Handle retries, timeouts, and partial failures
- Aggregate and return completed pipeline outputs
- Report job lifecycle events to `event-logger`
- Gate Layer 3 activation via `system-state-governor`

---

## Pipeline Execution Order (per job)

```
1. research-intelligence-agent   (topic research + SERP landscape)
2. content-architect             (topical structure + SuperPage blueprint)
3. content-writer                (content generation)
4. seo-validator                 (E-E-A-T + technical SEO validation)
5. image-strategy-agent          (visual asset strategy)
6. publisher-agent               (deployment to Vercel + Supabase record)
```

Each step must complete successfully before the next is dispatched.

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `job_request` | `object` | External / operator | ✅ | Production job definition |
| `task_result` | `object` | Any Layer 3 agent | ✅ | Completed task output |
| `task_failure` | `object` | Any Layer 3 agent | ✅ | Task failure report |
| `job_cancel` | `event` | Operator | ⚠️ | Cancel an in-progress job |
| `priority_override` | `object` | system-state-governor | ⚠️ | Reprioritize queued jobs |

### `job_request` Schema

```json
{
  "job_id": "string (uuid)",
  "job_type": "SUPERPAGE | SUPPORTING_CONTENT | CLUSTER",
  "topic": "string",
  "target_url_slug": "string",
  "priority": "LOW | NORMAL | HIGH",
  "config": {
    "locale": "string",
    "target_audience": "string",
    "content_depth": "SHALLOW | STANDARD | DEEP",
    "publish_immediately": "boolean"
  },
  "requested_at": "ISO8601",
  "requested_by": "string"
}
```

### `task_result` Schema

```json
{
  "job_id": "string",
  "task_id": "string",
  "agent_id": "string",
  "status": "SUCCESS | PARTIAL",
  "output": "object",
  "completed_at": "ISO8601",
  "duration_ms": "integer"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `task_dispatch` | `object` | Layer 3 agent | Task instruction for next pipeline step |
| `job_status_update` | `event` | event-logger | Pipeline progress record |
| `job_completed` | `object` | Requesting system | Aggregated pipeline output |
| `job_failed` | `object` | system-state-governor | Job failure report with context |
| `pipeline_metrics` | `object` | metrics-collector | Per-job duration, step latency |

### `task_dispatch` Schema

```json
{
  "job_id": "string",
  "task_id": "string (uuid)",
  "agent_id": "string",
  "step": "integer",
  "input": "object",
  "timeout_ms": "integer",
  "retry_policy": {
    "max_retries": "integer",
    "backoff_ms": "integer"
  },
  "dispatched_at": "ISO8601"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `JOB_RECEIVED` | Valid `job_request` arrives | Validate → enqueue → dispatch step 1 |
| `TASK_COMPLETE` | `task_result` received | Advance pipeline to next step |
| `TASK_FAILED` | `task_failure` received | Apply retry policy; escalate if exhausted |
| `TASK_TIMEOUT` | Step exceeds `timeout_ms` | Treat as failure; apply retry policy |
| `JOB_CANCEL` | `job_cancel` event received | Halt pipeline; mark job CANCELLED |
| `RETRY_EXHAUSTED` | Max retries reached on any step | Mark job FAILED; emit `job_failed` |
| `PIPELINE_COMPLETE` | Step 6 (publisher-agent) succeeds | Aggregate outputs; emit `job_completed` |

---

## Retry Policy (defaults)

| Agent | Timeout | Max Retries | Backoff |
|---|---|---|---|
| research-intelligence-agent | 120s | 3 | 10s |
| content-architect | 60s | 3 | 5s |
| content-writer | 180s | 2 | 15s |
| seo-validator | 60s | 3 | 5s |
| image-strategy-agent | 60s | 2 | 5s |
| publisher-agent | 90s | 3 | 10s |

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Layer 3 agent unavailable | Retry per policy; if exhausted mark job FAILED |
| system-state-governor unreachable | Queue job; retry activation gate every 30s |
| Supabase unavailable | Buffer job state in memory; flush on reconnect |
| Partial pipeline completion | Persist completed steps; allow resume from last successful step |
| Job queue overflow (>100 pending) | Reject new LOW priority jobs; emit WARNING |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Job records | Supabase | `omniseen_jobs` |
| Task records | Supabase | `omniseen_job_tasks` |
| Pipeline outputs | Supabase | `omniseen_job_outputs` |

---

## Boot Sequence (Self)

```
1. Receive layer_activation_signal (gate: all Layer 1 agents HEALTHY)
2. Self-register with system-state-governor
3. Load pending jobs from omniseen_jobs (resume interrupted pipelines)
4. Verify all Layer 3 agents registered and HEALTHY
5. Emit layer_activation_signal for Layer 3
6. Begin accepting job_request submissions
7. Set own status → HEALTHY
```

---

## Interfaces

```
POST /functions/v1/orchestrator/job          [submit job]
GET  /functions/v1/orchestrator/job/:id      [job status]
POST /functions/v1/orchestrator/job/:id/cancel
GET  /functions/v1/orchestrator/queue        [queue status]
```

## Self-Registration Payload

```json
{
  "agent_id": "generation-orchestrator",
  "layer": 2,
  "type": "orchestration",
  "version": "1.0.0",
  "capabilities": ["pipeline-orchestration", "task-dispatch", "retry-management", "job-state-tracking"],
  "health_endpoint": "/functions/v1/orchestrator/queue",
  "critical": true
}
```

---

## Constraints

- No Layer 3 agent executes without a `task_dispatch` from this operator.
- Pipeline steps execute **strictly in order** — no parallelism across dependent steps.
- Job state must be persisted before any task is dispatched.
- Does not perform content generation, SEO evaluation, or publishing.

## Error Codes

| Code | Meaning |
|---|---|
| `GO-001` | job_request schema invalid |
| `GO-002` | Layer 3 agent unavailable at dispatch |
| `GO-003` | Task timeout — retry initiated |
| `GO-004` | Retry policy exhausted — job failed |
| `GO-005` | Job queue capacity exceeded |
| `GO-006` | Pipeline resume failed — corrupt task state |
