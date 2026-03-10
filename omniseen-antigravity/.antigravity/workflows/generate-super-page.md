---
name: generate-super-page
description: Generate a local service Super Page from template with minimal business inputs.
command: generate-super-page
---

# Generate Super Page Workflow

## Trigger
`/generate-super-page`

## Steps

1. **Collect Inputs**
   Ask user:
   - `tenant_id`
   - `template_id` (or show template catalog: `node scripts/list-templates.js`)
   - `company_name`, `service`, `city`, `phone`
   - Optional: `address`, `neighborhoods`, `sub_services`
   - `publish_mode` (draft | published)

2. **Show Template Preview**
   List required blocks from chosen template.
   Confirm with user before generating.

3. **Run Pipeline**
   Activate `content-orchestrator` agent → `super-page-generator` skill.

4. **Report Results**
   Artifact:
   - Page title, slug
   - Blocks generated (list)
   - Quality score
   - Schema.org types generated
   - Publish status
   - Admin link: `https://app.omniseen.app/client/landing-pages`
