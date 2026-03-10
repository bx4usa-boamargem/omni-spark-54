---
name: supabase-deploy
description: >
  Use when you need to run Supabase migrations, deploy Edge Functions, or check
  database schema. Activates for "deploy edge functions", "run migrations",
  "check if table exists", or "update Supabase schema". Do not use for application
  code changes — only for Supabase infrastructure operations.
---

# Supabase Deploy

## Mission
Safely deploy schema migrations and Edge Functions to Supabase. Always dry-run
before applying. Never drop tables or columns without explicit human confirmation.

## Instructions

### Deploy Edge Functions
```
node scripts/deploy-functions.js --function <name>
```
Or all at once:
```
node scripts/deploy-functions.js --all
```

Runs: `supabase functions deploy <name> --project-ref $SUPABASE_PROJECT_REF`

Functions to deploy (OmniSeen):
- `generate-article`
- `generate-super-page`
- `generate-landing-page`
- `sales-agent-chat`
- `brand-sales-agent`
- `index-url`
- `process-queue`
- `funnel-autopilot`
- `content-api`

### Run Migrations
```
node scripts/run-migrations.js --dry-run
```
Review output. If safe:
```
node scripts/run-migrations.js --apply
```
Runs: `supabase db push --project-ref $SUPABASE_PROJECT_REF`

### Check Schema
```
node scripts/check-schema.js --tables <table1,table2>
```
Verifies tables exist with expected columns. Outputs diff against expected schema.

### Environment Check
Before any deploy:
```
node scripts/check-env.js
```
Verifies: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`,
`GEMINI_API_KEY`, `GOOGLE_CSE_KEY`, `GOOGLE_CSE_ID`, `GOOGLE_PLACES_KEY`.

## Constraints
- NEVER run `supabase db reset` — this destroys data
- NEVER drop columns without human approval in chat
- Always dry-run migrations first
- Log all deploy operations to `.tmp/deploy-log.json`
