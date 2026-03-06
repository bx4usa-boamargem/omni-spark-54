---
id: publisher-agent
layer: 3
type: production
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - generation-orchestrator
  - seo-validator
  - image-strategy-agent
blocks: []
tags: [publishing, deployment, vercel, supabase, content-delivery, layer-3]
---

# publisher-agent

> **Layer 3 — Production Agent**
> Final-stage deployment operator. Assembles all pipeline outputs into a publication-ready content package and deploys to Vercel. Records the published asset in Supabase and signals job completion to `generation-orchestrator`.

---

## Purpose

The `publisher-agent` is the terminal step in every OmniSeen production pipeline. It assembles the validated content document and image strategy into a deployable page, triggers Vercel deployment, persists the canonical content record to Supabase, and emits the final `job_completed` signal.

---

## Responsibilities

- Assemble final content package from pipeline outputs
- Generate deployable page format (MDX / HTML) for Vercel
- Trigger Vercel deployment via API
- Persist canonical content record to Supabase
- Register published URL in OmniSeen content registry
- Emit `job_completed` to `generation-orchestrator`
- Roll back deployment on failure and emit structured failure report

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `task_dispatch` | `object` | generation-orchestrator | ✅ | Task parameters with all pipeline outputs |
| `validated_content_document` | `object` | seo-validator (via orchestrator) | ✅ | Final validated content |
| `image_strategy` | `object` | image-strategy-agent (via orchestrator) | ✅ | Visual asset directives |
| `publish_config` | `object` | job_request config | ✅ | Deployment target configuration |

### `publish_config` Schema

```json
{
  "target_url_slug": "string",
  "vercel_project_id": "string",
  "vercel_deployment_env": "production | preview",
  "publish_immediately": "boolean",
  "locale": "string",
  "canonical_url": "string"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `publication_record` | `object` | Supabase | Canonical record of published content |
| `deployment_result` | `object` | generation-orchestrator | Vercel deployment outcome |
| `task_result` | `object` | generation-orchestrator | Final task completion signal |
| `rollback_report` | `object` | generation-orchestrator | Populated only on deployment failure |

### `publication_record` Schema

```json
{
  "publication_id": "string (uuid)",
  "job_id": "string",
  "url_slug": "string",
  "canonical_url": "string",
  "page_title": "string",
  "primary_keyword": "string",
  "word_count": "integer",
  "eeat_score": "integer",
  "validation_status": "PASS | PASS_WITH_WARNINGS",
  "vercel_deployment_id": "string",
  "deployment_url": "string",
  "deployment_env": "production | preview",
  "image_count": "integer",
  "internal_links_count": "integer",
  "published_at": "ISO8601",
  "last_updated_at": "ISO8601",
  "status": "LIVE | PREVIEW | ROLLED_BACK"
}
```

---

## Deployment Assembly Steps

```
1. Merge validated_content_document sections into page body
2. Apply heading hierarchy as MDX/HTML markup
3. Inject internal links at specified anchor positions
4. Embed image placeholders per image_strategy directives
5. Inject meta title, meta description, canonical URL
6. Inject E-E-A-T elements (author bio, last_updated, citations)
7. Generate robots/sitemap directives
8. Package for Vercel deployment
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `TASK_RECEIVED` | All pipeline outputs present in dispatch | Begin assembly |
| `ASSEMBLY_COMPLETE` | Page package built | Trigger Vercel deployment |
| `DEPLOYMENT_SUCCESS` | Vercel confirms deployment | Persist publication_record; emit task_result |
| `DEPLOYMENT_FAILURE` | Vercel returns error | Initiate rollback; emit rollback_report |
| `ROLLBACK_COMPLETE` | Prior version restored or deployment removed | Emit `task_failure` to orchestrator |
| `PUBLISH_IMMEDIATELY_FALSE` | `publish_config.publish_immediately = false` | Deploy to preview env only |

---

## Rollback Procedure

```
1. On deployment failure:
   a. If prior deployment exists → trigger Vercel rollback to prior deployment_id
   b. If no prior deployment → remove deployment; mark URL as unpublished
2. Update publication_record.status → ROLLED_BACK
3. Emit rollback_report to generation-orchestrator
4. Log full failure context to event-logger
```

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Vercel API unavailable | Retry 3x with 10s backoff; fail task with `PA-002` |
| Supabase unavailable at record time | Buffer publication_record in memory; retry flush every 30s |
| image_strategy missing | Proceed without image directives; flag in publication_record |
| Assembly produces invalid markup | Fail task immediately with `PA-003`; do not deploy |
| Duplicate URL slug detected | Halt deployment; emit `PA-005`; await operator resolution |

---

## Persistence

| Data | Store | Table |
|---|---|---|
| Publication records | Supabase | `omniseen_publications` |
| Content registry | Supabase | `omniseen_content_registry` |
| Deployment history | Supabase | `omniseen_deployment_history` |

---

## Boot Sequence (Self)

```
1. Receive task_dispatch from generation-orchestrator
2. Validate all required inputs present
3. Verify Vercel API connectivity
4. Verify Supabase connectivity
5. Begin assembly pipeline
```

---

## Interfaces

```
POST /functions/v1/publisher/deploy         [trigger deployment]
GET  /functions/v1/publisher/status/:job_id [deployment status]
POST /functions/v1/publisher/rollback       [manual rollback]
GET  /functions/v1/publisher/registry       [content registry query]
```

---

## Self-Registration Payload

```json
{
  "agent_id": "publisher-agent",
  "layer": 3,
  "type": "production",
  "version": "1.0.0",
  "capabilities": ["content-assembly", "vercel-deployment", "publication-registry", "rollback-management", "canonical-record"],
  "health_endpoint": "/functions/v1/publisher/status",
  "critical": false
}
```

---

## Constraints

- Will not deploy content without a `PASS` or `PASS_WITH_WARNINGS` validation status.
- Will not deploy if `url_slug` already exists in `omniseen_content_registry` without explicit override.
- Rollback is mandatory on deployment failure — partial deployments are not permitted.
- Is the **final Layer 3 agent** — its `task_result` triggers `job_completed` on the orchestrator.

## Error Codes

| Code | Meaning |
|---|---|
| `PA-001` | Required pipeline inputs missing |
| `PA-002` | Vercel API unavailable — retries exhausted |
| `PA-003` | Content assembly produced invalid markup |
| `PA-004` | Supabase record persistence failure |
| `PA-005` | Duplicate URL slug detected — deployment halted |
| `PA-006` | Rollback failed — manual intervention required |
