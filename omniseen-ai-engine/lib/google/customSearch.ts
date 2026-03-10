// ============================================================
// OmniSeen — Google Custom Search API Wrapper
// Cache: Supabase serp_cache (TTL 24h)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SerpResult } from "../../types/agents.ts";

export interface SearchOptions {
  num?: number;       // 1-10
  gl?: string;        // country code, e.g. "br"
  hl?: string;        // language, e.g. "pt"
  location?: string;  // e.g. "São Paulo, SP"
}

function buildCacheKey(query: string, options: SearchOptions): string {
  return `serp:${query.toLowerCase().trim()}:${options.gl ?? "br"}:${options.location ?? ""}`;
}

export async function searchSerp(
  query: string,
  options: SearchOptions = {}
): Promise<SerpResult[]> {
  const cacheKey = buildCacheKey(query, options);
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(sbUrl, sbKey);

  // Check cache first
  const { data: cached } = await sb
    .from("serp_cache")
    .select("results_json, expires_at")
    .eq("cache_key", cacheKey)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached.results_json as SerpResult[];
  }

  // Call Custom Search API
  const apiKey = Deno.env.get("GOOGLE_CSE_KEY");
  const cseId  = Deno.env.get("GOOGLE_CSE_ID");
  if (!apiKey || !cseId) throw new Error("GOOGLE_CSE_KEY or GOOGLE_CSE_ID not set");

  const params = new URLSearchParams({
    key: apiKey,
    cx:  cseId,
    q:   query,
    num: String(options.num ?? 10),
    gl:  options.gl ?? "br",
    hl:  options.hl ?? "pt",
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Custom Search API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const items: SerpResult[] = (data.items ?? []).map((item: Record<string, unknown>, i: number) => ({
    position:      i + 1,
    title:         item.title as string ?? "",
    url:           item.link  as string ?? "",
    description:   item.snippet as string ?? "",
    domain:        new URL(item.link as string).hostname,
    is_local_pack: false,
  }));

  // Persist to cache
  await sb.from("serp_cache").upsert({
    cache_key:    cacheKey,
    results_json: items,
    created_at:   new Date().toISOString(),
    expires_at:   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  return items;
}
