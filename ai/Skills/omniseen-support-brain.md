---
id: omniseen-support-brain
agent: support-agent
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - omniseen_knowledge_base (Supabase)
  - system-state-governor (read-only)
  - omniseen_jobs (Supabase)
auto_heal: true
governor_reporting: true
risk_level: LOW
tags: [support, diagnostics, onboarding, user-intelligence, knowledge-base]
project_location: /skills/support-agent/omniseen-support-brain.md
---

# omniseen-support-brain

> **support-agent / Skill**
> 24/7 intelligent support knowledge layer. Understands the full OmniSeen system architecture, diagnoses user-reported issues, explains errors in plain language, guides onboarding flows, and suggests resolution paths — without requiring human intervention.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `omniseen-support-brain` |
| Parent Agent | `support-agent` |
| Layer | 3 — Production |
| Risk Level | LOW |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

Most user problems in an AI-driven platform are one of three types: configuration errors, misunderstood system behavior, or real infrastructure failures. This skill classifies every user-reported issue into one of these categories, provides plain-language explanations of what happened, and gives actionable resolution steps — pulling from the OmniSeen knowledge base, live job state, and error code registry. It is the first responder for all user support interactions.

---

## 3. Responsibilities

- Classify incoming user issues by type (config, behavioral, infrastructure)
- Look up error codes against the full OmniSeen error registry
- Query live job state from `omniseen_jobs` to provide real-time context
- Explain system behavior in plain, non-technical language appropriate for user skill level
- Guide users through onboarding steps and feature activation flows
- Suggest specific remediation steps for each issue type
- Escalate unresolvable issues with a structured diagnostic report
- Learn from resolved issues by logging outcomes to the knowledge base

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `user_query` | `string` | User via support interface | ✅ | Raw user-submitted issue or question |
| `user_context` | `object` | User session / CRM | ✅ | Account info, plan tier, onboarding status |
| `job_context` | `object` | Supabase `omniseen_jobs` | ⚠️ | Most recent job records for the user |
| `system_state` | `object` | system-state-governor (read-only) | ⚠️ | Current platform health state |
| `knowledge_base` | `object` | Supabase `omniseen_knowledge_base` | ✅ | Indexed articles, error codes, resolution guides |

### `user_context` Schema

```json
{
  "user_id": "string",
  "plan_tier": "TRIAL | STARTER | PRO | ENTERPRISE",
  "onboarding_complete": "boolean",
  "onboarding_step": "string | null",
  "technical_level": "BEGINNER | INTERMEDIATE | ADVANCED",
  "account_age_days": "integer"
}
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `support_response` | `object` | User interface | Classified issue + plain-language explanation + steps |
| `escalation_report` | `object` | Human support queue | Structured diagnostic for unresolvable issues |
| `kb_update_signal` | `event` | Supabase knowledge base | Log new resolution pattern |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `support_response` Schema

```json
{
  "issue_type": "CONFIG | BEHAVIORAL | INFRASTRUCTURE | BILLING | ONBOARDING | UNKNOWN",
  "severity": "INFO | WARNING | ERROR | CRITICAL",
  "plain_explanation": "string",
  "root_cause": "string | null",
  "resolution_steps": ["string"],
  "related_docs": ["string"],
  "escalation_required": "boolean",
  "system_status_relevant": "boolean",
  "estimated_resolution_time": "string | null"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Knowledge base unavailable | Supabase query failure | Use cached KB entries (last 24h); flag `kb_partial` |
| Error code not in registry | Lookup returns null | Classify as UNKNOWN; provide general diagnostic framework |
| Job context unavailable | Supabase query timeout | Proceed with user_query only; request job ID from user |
| Classification confidence < 0.6 | Low confidence score | Present top 2 possible issue types; ask clarifying question |
| System-wide outage detected | governor state = HALTED | Override with outage notification; skip deep diagnosis |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Query received | `{skill_id, user_id, issue_type_preliminary}` |
| `skill.completed` | Response emitted | `{user_id, issue_type, escalation_required, kb_hit}` |
| `skill.escalated` | Escalation triggered | `{user_id, diagnostic_summary, unresolved_reason}` |
| `skill.failed` | KB + cache both unavailable | `{error_code}` |

---

## 8. Execution Flow

```
1. Receive user_query + user_context
2. Check system_state from governor (read-only):
   a. If HALTED → return outage response immediately
3. Classify issue type using NLP classification against KB categories
4. Load relevant KB articles for issue_type
5. Look up any error codes mentioned in user_query against error registry
6. Query omniseen_jobs for user's last 5 job records
7. Identify most likely root_cause
8. Generate plain_explanation calibrated to user.technical_level:
   - BEGINNER: no technical jargon, step-by-step
   - INTERMEDIATE: some technical context
   - ADVANCED: full diagnostic detail
9. Compile resolution_steps (ordered, specific, actionable)
10. If confidence < 0.6 → ask 1 clarifying question; do not guess
11. If escalation_required → compile escalation_report
12. Log outcome pattern to KB update queue
13. Emit governor_event: skill.completed
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| KB unavailable + no cache | MEDIUM | Generic framework response; escalate |
| System in HALTED state | HIGH | Outage response with ETA if available |
| Repeated escalation for same issue type | MEDIUM | Trigger KB gap signal; add to documentation queue |
| User provides no context | LOW | Ask structured 3-question diagnostic prompt |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `resolution_rate_without_escalation` | ≥ 75% |
| `avg_response_time_ms` | ≤ 3,000ms |
| `kb_hit_rate` | ≥ 80% |
| `escalation_rate` | ≤ 25% |
| `user_satisfaction_score` | ≥ 4.0 / 5.0 |
| `kb_gap_signals_per_week` | Monitored |

---

## 11. Project Location

```
/skills/support-agent/omniseen-support-brain.md
```

### Supabase Tables
```
omniseen_knowledge_base
omniseen_support_interactions
omniseen_escalation_queue
omniseen_error_registry
```

## Error Codes

| Code | Meaning |
|---|---|
| `OSB-001` | Knowledge base unavailable |
| `OSB-002` | Error code not in registry |
| `OSB-003` | Classification confidence below threshold |
| `OSB-004` | Escalation report generation failed |
| `OSB-005` | System state read failure |
