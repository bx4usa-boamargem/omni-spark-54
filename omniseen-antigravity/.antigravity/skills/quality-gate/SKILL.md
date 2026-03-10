---
name: quality-gate
description: >
  Use when you need to validate generated content before publishing. Performs
  hallucination detection, duplication check, SEO completeness, local signal
  consistency, and scores content 0–100. Activates for "validate [content]",
  "quality check before publish", or "run quality gate on [article/page]".
  If score < 70, returns retry_warnings and blocks publishing. Do not skip.
---

# Quality Gate (AG-11)

## Mission
Be the last defensive layer before any content reaches the portal. Score content
objectively, detect hallucinations, flag duplicate risks, and either approve or
return actionable retry_warnings that the section-writer can use to fix issues.

## Instructions

### Step 1 — Load All Artifacts
Required:
- `.tmp/content-draft.json`
- `.tmp/seo-pack.json`
- `.tmp/outline.json`
- `.tmp/entity-map.json`
- `business_inputs` from context
- `web_research_enabled` flag
- Existing tenant content index (from Supabase query via script)

### Step 2 — Run 6 Checks

#### Check 1: Hallucination Detection (25 pts)
```
node scripts/check-hallucinations.js
```
Patterns that auto-fail:
- Specific prices without source: `R\$\s*\d+` → -10pts each
- Certification claims: `certificado`, `ISO`, `INMETRO` not in business_inputs → -10pts
- Invented reviews: `avaliações`, `estrelas`, `clientes satisfeitos` + number → -10pts
- Years claim: `\d+ anos` not in business_inputs → -5pts
- `[CLAIM_UNVERIFIED]` flags from section-writer → -5pts each

#### Check 2: Keyword Coverage (20 pts)
- Primary keyword present in H1: +10pts
- Primary keyword in first 100 words: +5pts
- Keyword density 0.5–2.5%: +5pts

#### Check 3: Local Signal Consistency (20 pts, only for local intent)
- City/region in H1: +5pts
- City in ≥ 2 H2 headings: +5pts
- Service + city in meta_title: +5pts
- Phone in CTA section: +5pts

#### Check 4: SEO Completeness (20 pts)
- meta_title ≤ 60 chars: +5pts
- meta_description ≤ 155 chars: +5pts
- Schema JSON-LD present: +5pts
- Canonical URL correct: +5pts

#### Check 5: Internal Duplication (10 pts)
```
node scripts/check-duplication.js
```
Jaccard similarity against existing tenant content:
- < 20% similar: +10pts
- 20–40%: +5pts
- > 40%: 0pts + flag for human review

#### Check 6: Word Count (5 pts)
- Within 15% of target word count: +5pts

### Step 3 — Score and Decision
- Score ≥ 70: APPROVED → write `.tmp/qa-result.json` with `approved: true`
- Score 50–69: CONDITIONAL → list retry_warnings, agent retries section-writer once
- Score < 50: BLOCKED → requires human review, do not publish

### Step 4 — Output
```json
{
  "approved": true,
  "score": 82,
  "checks": { "hallucination": 25, "keyword": 18, "local": 20, "seo": 15, "duplication": 10, "word_count": 5 },
  "retry_warnings": [],
  "flags": []
}
```

## Constraints
- Never auto-approve content with Hallucination score = 0
- retry_warnings must be actionable: "Add city name to H2 #3" not "improve local signals"
- Maximum 1 automatic retry per pipeline run
