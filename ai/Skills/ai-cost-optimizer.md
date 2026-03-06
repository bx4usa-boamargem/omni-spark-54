---
id: ai-cost-optimizer
agent: generation-orchestrator
layer: 2
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - omniseen_model_usage_log (Supabase)
  - provider_config
auto_heal: true
governor_reporting: true
risk_level: HIGH
tags: [cost, ai-models, token-optimization, budget, provider-routing, generation-orchestrator]
project_location: /skills/generation-orchestrator/ai-cost-optimizer.md
---

# ai-cost-optimizer

> **generation-orchestrator / Skill**
> Monitors AI model costs in real time, enforces budget constraints, optimizes token usage per job, and intelligently routes model calls to cost-efficient providers without sacrificing output quality.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `ai-cost-optimizer` |
| Parent Agent | `generation-orchestrator` |
| Layer | 2 — Orchestration |
| Risk Level | HIGH |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

AI model inference is OmniSeen's primary variable cost. At scale, unoptimized model usage causes runaway spend, budget exhaustion mid-job, and unpredictable cost-per-article ratios. This skill enforces cost governance at every model call — selecting the minimum capable model for each task type, optimizing token payloads, alerting before budget thresholds are breached, and switching providers when cost-efficiency deteriorates.

---

## 3. Responsibilities

- Track running cost per job, per agent, per provider, and per model
- Select the minimum capable model for each task type based on cost-quality matrix
- Enforce per-job and per-period budget caps
- Optimize prompt token payloads before dispatch (remove redundancy, compress context)
- Detect cost anomalies (unexpected token spikes, model pricing changes)
- Switch to cheaper providers when quality parity is confirmed
- Alert governor before budget threshold breaches
- Persist cost records to Supabase for billing and analysis

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator core | ✅ | Task type and complexity context |
| `provider_config` | `object` | system config | ✅ | Available models, pricing, quality ratings |
| `usage_log` | `object` | Supabase `omniseen_model_usage_log` | ✅ | Historical cost and token data |
| `budget_config` | `object` | system config | ✅ | Per-job, daily, monthly budget caps |

### Cost-Quality Matrix (reference)

```
Task Type              Minimum Model Tier   Max Model Tier
─────────────────────────────────────────────────────────
SERP analysis          FAST                 STANDARD
Blueprint generation   STANDARD             STANDARD
Prose generation       STANDARD             PREMIUM
SEO validation         FAST                 STANDARD
Image strategy         FAST                 FAST
Publishing             FAST                 FAST
```

### `budget_config` Schema

```json
{
  "per_job_cap_usd": "number",
  "daily_cap_usd": "number",
  "monthly_cap_usd": "number",
  "alert_threshold_pct": "number (0-1)",
  "hard_stop_threshold_pct": "number (0-1)"
}
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `model_selection` | `object` | generation-orchestrator | Approved model + provider for task |
| `optimized_prompt` | `string` | Dispatching agent | Token-compressed prompt |
| `cost_record` | `object` | Supabase | Per-call cost entry |
| `budget_alert` | `event` | system-state-governor | Pre-breach warning |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `model_selection` Schema

```json
{
  "task_id": "string",
  "selected_model": "string",
  "provider_id": "string",
  "estimated_cost_usd": "number",
  "estimated_tokens": "integer",
  "selection_reason": "string",
  "fallback_model": "string | null"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Budget alert threshold reached | Running cost ≥ alert_threshold_pct | Downgrade remaining tasks to minimum model tier |
| Hard stop threshold reached | Running cost ≥ hard_stop_threshold_pct | Halt new model calls; complete in-flight; notify governor |
| Token spike detected | Tokens > 2x baseline for task type | Inspect and compress prompt; retry |
| Provider pricing change detected | Cost per token deviates > 20% from config | Update provider_config; re-evaluate model selection |
| Selected model unavailable | API error on model call | Switch to fallback_model immediately |
| Daily cap approached (>90%) | Daily running cost threshold | Defer LOW priority jobs; complete HIGH/NORMAL only |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Per task dispatch | `{skill_id, job_id, task_type, budget_remaining}` |
| `skill.completed` | Model selected | `{job_id, model, estimated_cost, budget_used_pct}` |
| `budget.alert` | Alert threshold hit | `{period, used_usd, cap_usd, threshold_pct}` |
| `budget.hard_stop` | Hard stop threshold hit | `{period, used_usd, cap_usd, jobs_halted}` |
| `skill.failed` | No models available | `{job_id, error_code}` |

---

## 8. Execution Flow

```
1. Receive task_dispatch with task_type and complexity
2. Load budget_config and current running costs from usage_log
3. Check budget status:
   a. If ≥ hard_stop_threshold → halt; emit budget.hard_stop
   b. If ≥ alert_threshold → downgrade tier; emit budget.alert
4. Look up cost-quality matrix for task_type
5. Select minimum capable model within budget headroom
6. Estimate token count for task (based on task complexity + historical baseline)
7. Optimize prompt payload:
   a. Remove redundant context
   b. Compress system prompt boilerplate
   c. Trim examples to minimum needed
8. Confirm estimated_cost fits within per_job_cap
9. Emit model_selection to orchestrator
10. After task completes: log actual cost to omniseen_model_usage_log
11. Update running cost totals
12. Emit governor_event: skill.completed
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| All models unavailable | CRITICAL | Jobs halted; governor notified immediately |
| Monthly cap exceeded | CRITICAL | All AI calls halted; operator alert required |
| Per-job cap exceeded mid-job | HIGH | Complete current step; halt remaining steps |
| Token optimization reduces quality | MEDIUM | Flag for review; use uncompressed prompt |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `avg_cost_per_article_usd` | Monitored (baseline established at launch) |
| `budget_alert_frequency` | ≤ 2 per week |
| `model_downgrade_rate` | ≤ 10% of tasks |
| `token_optimization_savings_pct` | ≥ 15% vs unoptimized |
| `hard_stop_events` | 0 per month |
| `cost_accuracy_pct` | Estimated vs actual cost within ±10% |

---

## 11. Project Location

```
/skills/generation-orchestrator/ai-cost-optimizer.md
```

### Supabase Tables
```
omniseen_model_usage_log
omniseen_cost_summaries
omniseen_budget_events
```

## Error Codes

| Code | Meaning |
|---|---|
| `ACO-001` | Hard stop threshold reached |
| `ACO-002` | All model providers unavailable |
| `ACO-003` | Per-job cap exceeded mid-execution |
| `ACO-004` | Token spike — prompt compression applied |
| `ACO-005` | Provider pricing deviation detected |
