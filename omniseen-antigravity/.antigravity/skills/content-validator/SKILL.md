---
name: content-validator
description: >
  Use when you need to check any piece of generated content for factual claims,
  hallucinations, or compliance with OmniSeen's anti-invention rules. Activates
  for "validate content", "check for hallucinations in [text]", or "verify claims
  in [draft]". Lighter than quality-gate — use this for quick spot checks during
  writing. Do not use as final gate before publishing — quality-gate does that.
---

# Content Validator

## Mission
Quick, focused validation of content fragments for hallucination and compliance
risks. Designed to be called during the writing process, not just at the end.

## Instructions

### Check: Forbidden Patterns
Run regex scan on content:

```
node scripts/scan-forbidden-patterns.js --input <file>
```

Forbidden patterns (each triggers a FLAG):
1. Price without source: `R\$\s*[\d.,]+` or `USD\s*[\d.,]+`
2. Specific certification: `certificado (pela|por|ISO|INMETRO|ABNT)`
3. Invented reviews: `\d+\s*(clientes?|avaliações?|reviews?)` without business_inputs source
4. Years fabricated: `há \d+ anos` or `\d+ anos (de|no mercado)` without business_inputs
5. Award claims: `prêmio`, `premiado`, `melhor (empresa|serviço) de`
6. Guarantee without basis: `garantimos`, `100% garantido`, `sem riscos`
7. Competitor mention: any brand name not in whitelist

### Check: Tone Compliance
For Brazilian Portuguese content:
- Avoid excessive formality (not "vossa senhoria")
- Avoid slang (não "top demais", "mandou bem")
- Target: professional + approachable

### Output
```json
{
  "flags": [
    { "type": "price_claim", "text": "R$ 150", "line": 42, "action": "remove_or_cite" }
  ],
  "flag_count": 1,
  "safe_to_proceed": false
}
```

`safe_to_proceed = true` only if `flag_count = 0`.

## Constraints
- This is a SCAN skill, not a rewrite skill
- Never auto-fix content — only flag and explain
- Output to `.tmp/validation-flags.json`
