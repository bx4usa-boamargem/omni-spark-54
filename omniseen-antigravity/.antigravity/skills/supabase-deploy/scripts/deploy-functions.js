#!/usr/bin/env node
/**
 * supabase-deploy/scripts/deploy-functions.js
 * Usage: node deploy-functions.js --function <name>
 *        node deploy-functions.js --all
 */

import { execSync } from 'child_process';
import fs from 'fs';

const FUNCTIONS = [
  'generate-article',
  'generate-super-page',
  'generate-landing-page',
  'sales-agent-chat',
  'brand-sales-agent',
  'index-url',
  'process-queue',
  'funnel-autopilot',
  'content-api',
];

const args = process.argv.slice(2);
const fnIdx = args.indexOf('--function');
const deployAll = args.includes('--all');
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!projectRef) {
  console.error('[ERROR] SUPABASE_PROJECT_REF not set');
  process.exit(1);
}

const toDeply = deployAll ? FUNCTIONS : fnIdx >= 0 ? [args[fnIdx + 1]] : [];

if (toDeply.length === 0) {
  console.error('Usage: node deploy-functions.js --function <name> | --all');
  console.log('Available functions:', FUNCTIONS.join(', '));
  process.exit(1);
}

const log = [];
let failed = 0;

for (const fn of toDeply) {
  if (!deployAll && !FUNCTIONS.includes(fn)) {
    console.warn(`[WARN] Unknown function: ${fn}. Proceeding anyway.`);
  }

  try {
    console.log(`[DEPLOY] ${fn}...`);
    execSync(`supabase functions deploy ${fn} --project-ref ${projectRef}`, {
      stdio: 'inherit',
      timeout: 60000
    });
    console.log(`[OK] ${fn} deployed`);
    log.push({ function: fn, status: 'success', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`[FAIL] ${fn}: ${err.message}`);
    log.push({ function: fn, status: 'failed', error: err.message, timestamp: new Date().toISOString() });
    failed++;
  }
}

fs.mkdirSync('.tmp', { recursive: true });
fs.writeFileSync('.tmp/deploy-log.json', JSON.stringify(log, null, 2));

console.log(`\n=== Deploy Summary ===`);
console.log(`Deployed: ${toDeply.length - failed}/${toDeply.length}`);
if (failed > 0) {
  console.error(`Failed: ${failed}`);
  process.exit(1);
}
process.exit(0);
