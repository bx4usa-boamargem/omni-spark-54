---
id: authority-writer-skill
agent: content-writer
layer: 3
type: skill
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - content-blueprint (from content-architect)
tags: [writing, authority, long-form, eeat, superpage, content-writer]
---

# authority-writer-skill

> **content-writer / Skill 1 of 4**
> Generates authoritative, human-grade, E-E-A-T-compliant long-form prose for OmniSeen SuperPages. This skill is the primary writing engine — it produces the core body of every section defined in the `content_blueprint`.

---

## Purpose

Transform a structured `content_blueprint` section into publication-ready long-form prose that reads as written by a subject-matter expert. The output must demonstrate depth, authority, and firsthand expertise signals that satisfy Google's E-E-A-T quality rater guidelines without sounding AI-generated.

---

## Activation Condition

This skill activates when `content-writer` receives a `task_dispatch` with:
- `content_blueprint.heading_structure` containing at least one section
- `generation_config.tone` set to any valid value
- `content_depth` set to `STANDARD` or `DEEP`

For `SHALLOW` content, this skill activates in reduced mode (see Execution Modes).

---

## Core Writing Principles

### 1. Expertise-First Positioning
Every section must open by establishing domain authority. The first 2–3 sentences of each H2 section must signal depth of knowledge — not a generic introduction. Use precise terminology, quantified claims, or practitioner-level framing.

**Anti-pattern:** "Search engine optimization is important for websites."
**Authority pattern:** "Technical crawl efficiency determines whether Googlebot allocates sufficient crawl budget to index your deepest content — a factor that directly limits organic visibility for sites exceeding 10,000 pages."

### 2. Claim Density
Each paragraph must carry at least one of:
- A specific statistic or data point
- A named framework, methodology, or principle
- A causal relationship (X causes Y because Z)
- A practitioner insight (what professionals do differently)

Paragraphs without a substantive claim are flagged for `eeat-enrichment-skill` processing.

### 3. Sentence Architecture
Vary sentence length deliberately:
- Short sentences (8–12 words) for emphasis and transitions
- Medium sentences (18–28 words) for explanation and context
- Long sentences (30–45 words) for complex causal chains — used sparingly

No two consecutive paragraphs should have the same rhythm pattern.

### 4. Voice and Register
- Default register: **authoritative but accessible** — expert writing a practitioner guide, not an academic paper
- Avoid hedging language: "might," "could possibly," "some people think"
- Avoid filler transitions: "In this section we will explore," "It is worth noting that"
- Use active voice for 80%+ of sentences
- Second person ("you") is permitted for instructional sections

### 5. Keyword Integration
- Primary keyword: appears naturally in first 100 words of section and at least once per 400 words thereafter
- Secondary keywords: distributed across H3 subsections without forcing
- Semantic keywords: woven into explanatory prose — never as a list

Never bold keywords. Never repeat the exact same phrase within 200 words.

---

## Execution Modes

| Mode | Trigger | Behavior |
|---|---|---|
| `DEEP` | `content_depth: DEEP` | Full execution — all principles applied; 350–600 words per H2 section |
| `STANDARD` | `content_depth: STANDARD` | Core execution — 200–350 words per H2 section |
| `SHALLOW` | `content_depth: SHALLOW` | Reduced mode — 100–200 words per H2; expertise signals only in H1 intro |

---

## Section Generation Process

```
For each section in content_blueprint.heading_structure:

1. Read section_purpose and target_keywords
2. Identify the section's knowledge domain
3. Write opening statement as expertise signal (2–3 sentences)
4. Develop body paragraphs with claim density rule
5. Apply sentence architecture variation
6. Integrate keywords naturally per density rules
7. Write closing sentence that bridges to next section
8. Check word_count against word_count_target (±15% tolerance)
9. Flag section if under target by >15% for section-expansion-skill
10. Pass section to eeat-enrichment-skill for signal injection
```

---

## Output per Section

```json
{
  "heading_level": "string",
  "heading_text": "string",
  "content": "string (markdown prose)",
  "word_count": "integer",
  "keywords_used": ["string"],
  "claim_density_score": "integer (claims per 100 words)",
  "quality_flag": "PASS | REVIEW_REQUIRED",
  "flagged_reason": "string | null",
  "ready_for_eeat": "boolean"
}
```

---

## Quality Gate (per section)

| Check | Threshold | On Fail |
|---|---|---|
| Word count | Within ±15% of target | Flag `REVIEW_REQUIRED` → trigger `section-expansion-skill` |
| Claim density | ≥ 1.5 claims per 100 words | Flag for `eeat-enrichment-skill` |
| Keyword present | Primary keyword appears at least once | Auto-inject on next revision pass |
| No filler transitions | 0 detected | Rewrite opening sentence |
| Voice ratio | ≥ 80% active voice | Flag `REVIEW_REQUIRED` |

---

## Anti-Patterns (hard rejections)

The following patterns trigger automatic section rejection and rewrite:

- Opening with "In today's [topic] landscape..."
- Opening with "Are you looking for..."
- Any sentence beginning with "It is important to note"
- Keyword repetition within 200-word window
- Two consecutive sentences of identical length (±2 words)
- Lists masquerading as paragraphs (3+ consecutive one-sentence lines)

---

## Interaction with Other Skills

| Skill | Interaction |
|---|---|
| `eeat-enrichment-skill` | Receives section output; injects author signals, citations, expertise markers |
| `humanization-layer-skill` | Receives post-eeat section; applies naturalness pass |
| `section-expansion-skill` | Triggered when section is flagged `REVIEW_REQUIRED` for word count |

This skill produces the raw authoritative draft. It does not finalize — it initiates the writing pipeline.

---

## Prompt Architecture (internal — for AI model call)

```
SYSTEM:
You are a senior subject-matter expert and professional content strategist
writing a definitive guide on [topic] for [target_audience].
Your writing reflects 10+ years of hands-on experience.
You do not write introductions — you write like someone already mid-expertise.
You do not use filler. You do not hedge. You substantiate every claim.

SECTION CONTEXT:
Heading: [heading_text]
Purpose: [section_purpose]
Target keywords: [target_keywords]
Word count target: [word_count_target]
Tone: [generation_config.tone]

RULES:
- Start with an expertise signal, not a definition
- Minimum [word_count_target * 0.85] words
- Include at least [word_count_target / 100 * 1.5] substantive claims
- Integrate keywords naturally — never force
- No bullet points unless the section_purpose explicitly calls for a list
- Active voice dominant
- End with a bridging sentence to the next section: [next_section_heading]

OUTPUT: Markdown prose only. No meta-commentary.
```

---

## Constraints

- Does not generate headings — uses headings from `content_blueprint` verbatim.
- Does not make factual claims it cannot support from the research brief context.
- Does not produce bullet-point lists as substitutes for prose (unless `section_purpose` specifies a list format).
- Output must be Markdown — no HTML tags in body prose.

---

## Error Codes

| Code | Meaning |
|---|---|
| `AWS-001` | Blueprint section missing required fields |
| `AWS-002` | Model API call failed |
| `AWS-003` | Anti-pattern detected — section rejected, rewrite triggered |
| `AWS-004` | Word count below minimum threshold after 2 rewrite attempts |
| `AWS-005` | Claim density below minimum — escalated to eeat-enrichment-skill |
