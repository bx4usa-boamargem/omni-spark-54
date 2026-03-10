#!/usr/bin/env node
/**
 * supabase-deploy/scripts/check-env.js
 * Verifies all required environment variables are set before any deploy.
 */

const REQUIRED = [
  { key: 'SUPABASE_URL', critical: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', critical: true },
  { key: 'SUPABASE_PROJECT_REF', critical: true },
  { key: 'GEMINI_API_KEY', critical: true },
  { key: 'GOOGLE_CSE_KEY', critical: false },
  { key: 'GOOGLE_CSE_ID', critical: false },
  { key: 'GOOGLE_PLACES_KEY', critical: false },
  { key: 'GOOGLE_INDEXING_SA_KEY', critical: false },
  { key: 'INDEXNOW_KEY', critical: false },
];

let allCriticalOk = true;

console.log('\n=== OmniSeen Environment Check ===\n');

for (const env of REQUIRED) {
  const val = process.env[env.key];
  const status = val ? '✅' : env.critical ? '❌ MISSING (CRITICAL)' : '⚠️  missing (optional)';
  console.log(`${status}  ${env.key}`);
  if (!val && env.critical) allCriticalOk = false;
}

console.log('');

if (!allCriticalOk) {
  console.error('❌ Critical environment variables missing. Set them before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ All critical variables present. Ready to deploy.\n');
  process.exit(0);
}
