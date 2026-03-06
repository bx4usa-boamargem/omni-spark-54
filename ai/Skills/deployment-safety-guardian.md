---
id: deployment-safety-guardian
agent: publisher-agent
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - publisher-agent
  - Vercel API
  - Supabase
auto_heal: true
governor_reporting: true
risk_level: HIGH
tags: [deployment, safety, validation, vercel, env-vars, migrations, publisher-agent]
project_location: /skills/publisher-agent/deployment-safety-guardian.md
---

# deployment-safety-guardian

> **publisher-agent / Skill**
> Pre-deployment safety validation layer. Checks routes, authentication, environment variables, and database migrations before any Vercel deployment is triggered — preventing broken deployments from reaching production.

---

## 1. Identity

| Field | Value |
|---|---|
| Skill ID | `deployment-safety-guardian` |
| Parent Agent | `publisher-agent` |
| Layer | 3 — Production |
| Risk Level | HIGH |
| Auto-Heal | Enabled |
| Governor Reporting | Mandatory |
| Runtime | Antigravity |

---

## 2. Purpose

A broken deployment is worse than no deployment. It exposes users to error pages, disrupts SEO crawling, and can corrupt database state. This skill acts as the final gate before every Vercel deployment — executing a structured pre-flight checklist that validates routes, authentication paths, environment variable completeness, and pending database migrations. No deployment proceeds until this skill issues a CLEAR signal.

---

## 3. Responsibilities

- Validate all required environment variables are present and non-empty in the target deployment environment
- Check that all defined application routes resolve correctly (no 404/500 patterns)
- Validate authentication paths are functional and not broken by the new deployment
- Detect and evaluate pending Supabase database migrations before deployment
- Verify Vercel project configuration is consistent with OmniSeen deployment spec
- Issue CLEAR or BLOCKED signal to `publisher-agent`
- Produce a structured pre-flight report for every deployment attempt

---

## 4. Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `deployment_package` | `object` | publisher-agent core | ✅ | Assembled content package ready for deploy |
| `publish_config` | `object` | job_request | ✅ | Target environment, project ID, URL slug |
| `env_var_manifest` | `object` | system config | ✅ | Required environment variables per environment |
| `route_manifest` | `object` | application config | ✅ | All defined application routes |
| `migration_status` | `object` | Supabase | ✅ | Pending migration state |

### `env_var_manifest` Schema

```json
{
  "environment": "production | preview",
  "required_vars": [
    {
      "key": "string",
      "required": "boolean",
      "sensitive": "boolean"
    }
  ]
}
```

### Pre-flight Check Categories

```
CATEGORY 1 — ENVIRONMENT
  - All required env vars present in target environment
  - No empty string values for required vars
  - Sensitive vars not exposed in logs

CATEGORY 2 — ROUTES
  - New URL slug does not conflict with existing routes
  - All static routes in route_manifest resolve (no 404)
  - Dynamic route patterns are valid

CATEGORY 3 — AUTHENTICATION
  - Auth provider config present and valid
  - Protected routes have auth middleware applied
  - No auth bypass paths introduced by new deployment

CATEGORY 4 — DATABASE
  - No pending breaking migrations on target Supabase project
  - Required tables for new content exist
  - Foreign key constraints valid for new content record

CATEGORY 5 — DEPLOYMENT CONFIG
  - Vercel project ID matches publish_config
  - Build output directory configured correctly
  - Deployment environment matches intended target
```

---

## 5. Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `preflight_report` | `object` | publisher-agent | Full check results with CLEAR or BLOCKED |
| `deployment_signal` | `string` | publisher-agent | `CLEAR` or `BLOCKED` |
| `governor_event` | `event` | system-state-governor | Skill execution status |

### `preflight_report` Schema

```json
{
  "deployment_id": "string (uuid)",
  "job_id": "string",
  "environment": "string",
  "signal": "CLEAR | BLOCKED",
  "checks": [
    {
      "category": "string",
      "check_id": "string",
      "check_name": "string",
      "status": "PASS | FAIL | WARNING | SKIPPED",
      "detail": "string | null",
      "blocking": "boolean"
    }
  ],
  "blocking_failures": ["string"],
  "warnings": ["string"],
  "evaluated_at": "ISO8601",
  "evaluation_duration_ms": "integer"
}
```

---

## 6. Auto-Heal Actions

| Failure Scenario | Detection | Auto-Heal Action |
|---|---|---|
| Non-breaking env var missing | Optional var absent | Set WARNING; do not block |
| Required env var missing | Required var absent | Block deployment; emit specific var name to operator |
| Pending non-breaking migration | Migration flagged as additive | Allow deployment; log migration advisory |
| Pending breaking migration | Migration flagged as destructive | Block deployment; require manual migration execution |
| Route conflict detected | New slug matches existing | Block; suggest alternative slug pattern |
| Vercel API check unavailable | Cannot verify project config | Skip category 5 checks; log SKIPPED; do not block |

---

## 7. Governor Integration

| Event | Trigger | Payload |
|---|---|---|
| `skill.started` | Pre-flight initiated | `{skill_id, job_id, environment, checks_count}` |
| `deployment.cleared` | Signal = CLEAR | `{job_id, environment, warnings_count}` |
| `deployment.blocked` | Signal = BLOCKED | `{job_id, environment, blocking_failures}` |
| `skill.degraded` | Some checks skipped | `{job_id, skipped_checks, reason}` |
| `skill.failed` | Pre-flight engine failure | `{job_id, error_code}` |

`deployment.blocked` events emit as HIGH severity to `alert-dispatcher`.

---

## 8. Execution Flow

```
1. Receive deployment_package + publish_config from publisher-agent
2. Load env_var_manifest for target environment
3. Load route_manifest from application config
4. Query Supabase for pending migration status

CATEGORY 1 — ENVIRONMENT:
5. For each required_var in env_var_manifest:
   a. Check presence in Vercel environment config
   b. Check value is non-empty
   c. Assign PASS / FAIL / WARNING

CATEGORY 2 — ROUTES:
6. Check new URL slug against existing route_manifest
7. Validate dynamic route patterns for new slug

CATEGORY 3 — AUTHENTICATION:
8. Verify auth middleware presence on protected routes
9. Check auth provider config completeness

CATEGORY 4 — DATABASE:
10. Evaluate pending migrations:
    a. Classify each as ADDITIVE or BREAKING
    b. BREAKING → blocking failure
    c. ADDITIVE → warning only
11. Verify required tables exist for new content record

CATEGORY 5 — DEPLOYMENT CONFIG:
12. Verify Vercel project ID matches publish_config
13. Check build output directory config

14. Compile preflight_report
15. If any blocking failures → signal = BLOCKED
16. If all pass (warnings acceptable) → signal = CLEAR
17. Emit deployment_signal to publisher-agent
18. Emit governor_event
19. Persist preflight_report to Supabase
```

---

## 9. Failure Scenarios

| Scenario | Severity | Outcome |
|---|---|---|
| Required env var missing | HIGH | BLOCKED; specific var surfaced to operator |
| Breaking migration pending | HIGH | BLOCKED; migration must run before deploy |
| Route conflict | MEDIUM | BLOCKED; slug revision required |
| Auth check fails | HIGH | BLOCKED; auth configuration repair required |
| Pre-flight engine crashes | HIGH | Deployment halted; governor notified |

---

## 10. Metrics

| Metric | Target |
|---|---|
| `deployment_block_rate` | ≤ 5% of deployments |
| `preflight_pass_rate` | ≥ 95% on first attempt |
| `avg_preflight_duration_ms` | ≤ 8,000ms |
| `false_block_rate` | ≤ 1% (cleared on manual review) |
| `broken_production_deployments` | 0 |

---

## 11. Project Location

```
/skills/publisher-agent/deployment-safety-guardian.md
```

### Supabase Tables
```
omniseen_preflight_reports
omniseen_deployment_history
```

## Error Codes

| Code | Meaning |
|---|---|
| `DSG-001` | Required environment variable missing |
| `DSG-002` | Breaking database migration pending |
| `DSG-003` | Route conflict detected |
| `DSG-004` | Authentication middleware misconfigured |
| `DSG-005` | Pre-flight engine failure |
| `DSG-006` | Vercel project config mismatch |
