#!/usr/bin/env node
/**
 * content-validator/scripts/scan-forbidden-patterns.js
 * Called by: content-validator skill
 * Usage: node scan-forbidden-patterns.js --input <file>
 */

import fs from 'fs';

const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const inputFile = inputIdx >= 0 ? args[inputIdx + 1] : '.tmp/content-draft.json';

const PATTERNS = [
  {
    type: 'price_claim',
    regex: /R\$\s*[\d.,]+|USD\s*[\d.,]+|\d+\s*reais/gi,
    action: 'remove_or_cite',
    message: 'Preço específico sem fonte verificável'
  },
  {
    type: 'certification_claim',
    regex: /certificad[ao]\s*(pela?|por|ISO|INMETRO|ABNT|NBR)\b/gi,
    action: 'remove_or_rephrase',
    message: 'Certificação sem dado do cliente'
  },
  {
    type: 'invented_reviews',
    regex: /\d+\s*(clientes?|avaliações?|reviews?|estrelas?)\b/gi,
    action: 'remove',
    message: 'Número de clientes/avaliações sem fonte'
  },
  {
    type: 'years_fabricated',
    regex: /há\s+\d+\s+anos|desde\s+\d{4}|\d+\s+anos\s+(de|no)\s+mercado/gi,
    action: 'replace_with_neutral',
    message: 'Anos de mercado sem dado do cliente'
  },
  {
    type: 'award_claim',
    regex: /prêmi[ao]\b|premiado\b|melhor\s+(empresa|serviço|profissional)\s+d[eo]/gi,
    action: 'remove',
    message: 'Afirmação de prêmio/reconhecimento sem fonte'
  },
  {
    type: 'guarantee_claim',
    regex: /garantimos\b|100%\s+garantido|sem\s+riscos|resultado\s+garantido/gi,
    action: 'rephrase',
    message: 'Garantia absoluta sem base contratual'
  },
  {
    type: 'unverified_claim_flag',
    regex: /\[CLAIM_UNVERIFIED\]/g,
    action: 'resolve_or_remove',
    message: 'Flag de claim não verificado do section-writer'
  }
];

function scanContent(text) {
  const flags = [];
  const lines = text.split('\n');

  for (const pattern of PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      // Find line number
      const before = text.substring(0, match.index);
      const lineNum = before.split('\n').length;

      flags.push({
        type: pattern.type,
        text: match[0],
        line: lineNum,
        action: pattern.action,
        message: pattern.message
      });
    }
  }

  return flags;
}

(async () => {
  try {
    let contentText;

    if (!fs.existsSync(inputFile)) {
      console.error(`[ERROR] Input file not found: ${inputFile}`);
      process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    // Extract text from content_html or content_json
    contentText = raw.content_html || JSON.stringify(raw.content_json || raw);

    const flags = scanContent(contentText);

    const result = {
      flags,
      flag_count: flags.length,
      safe_to_proceed: flags.length === 0,
      scanned_at: new Date().toISOString()
    };

    fs.mkdirSync('.tmp', { recursive: true });
    fs.writeFileSync('.tmp/validation-flags.json', JSON.stringify(result, null, 2));

    if (flags.length === 0) {
      console.log('[OK] No forbidden patterns found — safe to proceed');
    } else {
      console.warn(`[WARN] ${flags.length} flags found:`);
      for (const f of flags) {
        console.warn(`  Line ${f.line}: [${f.type}] "${f.text}" → ${f.action}`);
      }
    }

    process.exit(flags.length === 0 ? 0 : 1);
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  }
})();
