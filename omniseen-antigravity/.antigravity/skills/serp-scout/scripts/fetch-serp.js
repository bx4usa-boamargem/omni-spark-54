#!/usr/bin/env node
/**
 * serp-scout/scripts/fetch-serp.js
 * Called by: serp-scout skill (Step 2)
 * Usage: node fetch-serp.js "<keyword>" "<locale>"
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

const keyword = process.argv[2];
const locale = process.argv[3] || 'pt-BR';

if (!keyword) {
  console.error('Usage: node fetch-serp.js "<keyword>" "<locale>"');
  process.exit(1);
}

if (!GOOGLE_CSE_KEY || !GOOGLE_CSE_ID) {
  console.warn('[WARN] GOOGLE_CSE_KEY or GOOGLE_CSE_ID missing — skipping SERP fetch');
  const empty = { keyword, locale, serp: { urls: [], paa: [], related: [] }, cached: false, skipped: true };
  fs.mkdirSync('.tmp', { recursive: true });
  fs.writeFileSync('.tmp/serp-result.json', JSON.stringify(empty, null, 2));
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkCache(keyword, locale) {
  const cacheKey = `${keyword}::${locale}`;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('serp_cache')
    .select('result_json, created_at')
    .eq('query', cacheKey)
    .gte('created_at', cutoff)
    .single();
  return data?.result_json || null;
}

async function fetchSerp(keyword, locale) {
  const gl = locale.split('-')[1]?.toLowerCase() || 'br';
  const hl = locale.split('-')[0] || 'pt';
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(keyword)}&gl=${gl}&hl=${hl}&num=10`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SERP API error: ${res.status} ${res.statusText}`);
  const data = await res.json();

  const urls = (data.items || []).map(item => ({
    url: item.link,
    title: item.title,
    snippet: item.snippet,
    displayLink: item.displayLink
  }));

  const paa = (data.relatedSearches?.queries?.request || []).map(q => q.title);
  const related = (data.spelling?.correctedQuery ? [data.spelling.correctedQuery] : []);

  return { urls, paa, related };
}

async function saveCache(keyword, locale, result) {
  const cacheKey = `${keyword}::${locale}`;
  await supabase.from('serp_cache').upsert({
    query: cacheKey,
    locale,
    result_json: result,
    created_at: new Date().toISOString()
  }, { onConflict: 'query' });
}

(async () => {
  try {
    // Check cache
    const cached = await checkCache(keyword, locale);
    if (cached) {
      console.log(`[CACHE HIT] ${keyword} (${locale})`);
      fs.mkdirSync('.tmp', { recursive: true });
      fs.writeFileSync('.tmp/serp-result.json', JSON.stringify({ ...cached, cached: true }, null, 2));
      process.exit(0);
    }

    // Fetch live
    console.log(`[FETCH] SERP for: ${keyword} (${locale})`);
    const serp = await fetchSerp(keyword, locale);
    const result = { keyword, locale, serp, cached: false, timestamp: new Date().toISOString() };

    // Save cache
    await saveCache(keyword, locale, result);

    // Write output
    fs.mkdirSync('.tmp', { recursive: true });
    fs.writeFileSync('.tmp/serp-result.json', JSON.stringify(result, null, 2));

    console.log(`[OK] ${serp.urls.length} results, ${serp.paa.length} PAA, ${serp.related.length} related`);
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  }
})();
