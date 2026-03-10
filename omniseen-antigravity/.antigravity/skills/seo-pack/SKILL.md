---
name: seo-pack
description: >
  Use when you need to generate the complete SEO metadata package for a blog post
  or super page: meta title, meta description, canonical URL, Open Graph tags,
  JSON-LD schema (Article, LocalBusiness, FAQPage, BreadcrumbList). Activates for
  "generate SEO pack for [content]", "add schema to [page]", or "finalize metadata
  for [article]". Always runs after section-writer and before quality-gate.
---

# SEO Pack Finalizer (AG-10)

## Mission
Generate the complete, ready-to-publish SEO metadata for any content type.
No placeholders — every field must have a real value or be explicitly omitted
with a reason. Schema.org output must validate against Google's Rich Results specs.

## Instructions

### Step 1 — Load Content
Required:
- `.tmp/content-draft.json`
- `.tmp/outline.json` (for H1, sections, FAQ)
- `.tmp/entity-map.json` (for primary keyword, intent)
- `business_inputs` from context
- `tenant_domain` from context (for canonical and breadcrumb)

### Step 2 — Generate Meta Tags
```
node scripts/generate-meta.js
```
Rules:
- `meta_title`: keyword | brand | city (max 60 chars). Never "| OmniSeen"
- `meta_description`: intent-based, includes primary keyword, CTA hint (max 155 chars)
- `canonical_url`: `https://{tenant_domain}/{path}/{slug}`
- `og_title` = meta_title (unless override in business_inputs)
- `og_description` = meta_description
- `og_image`: use brand logo URL if available, else omit

### Step 3 — Generate JSON-LD Schema
Run `node scripts/generate-schema.js --content-type <type>`:

**For blog_post:**
```json
{
  "@type": "Article",
  "headline": "...",
  "datePublished": "...",
  "dateModified": "...",
  "author": { "@type": "Organization", "name": "..." }
}
```

**For super_page_local:**
```json
{
  "@type": ["LocalBusiness", "Service"],
  "name": "...",
  "description": "...",
  "telephone": "...",
  "address": { ... },  // only if address in business_inputs
  "areaServed": [...],
  "hasOfferCatalog": { ... }
}
```
Plus `FAQPage` schema if outline has FAQ sections.
Plus `BreadcrumbList` always.

### Step 4 — Validate Schema
```
node scripts/validate-schema.js
```
Checks:
- No empty required fields
- No invented telephone/address
- FAQPage requires at least 3 Q&A pairs
- BreadcrumbList starts at homepage

### Step 5 — Output
Writes to `.tmp/seo-pack.json`:
```json
{
  "meta_title": "...",
  "meta_description": "...",
  "canonical_url": "...",
  "og_tags": { ... },
  "schema_json": { ... },
  "slug": "..."
}
```

## Constraints
- NEVER invent address, coordinates, or phone numbers not in business_inputs
- If address missing: omit geo fields from LocalBusiness schema
- Slug must be URL-safe, lowercase, hyphenated, max 60 chars
- Schema must pass Google Rich Results structural validation
