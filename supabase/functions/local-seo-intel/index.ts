import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminSupabaseClient } from "../_shared/getIntegrationKey.ts";
import { getGlobalKey } from "../_shared/getGlobalKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface LocalSeoIntelRequest {
  blogId?: string;
  territoryId?: string;
  mode?: "single" | "batch";
  dryRun?: boolean;
  maxBlogs?: number;
  maxTerritories?: number;
}

type TerritoryRow = {
  id: string;
  blog_id: string;
  tenant_id: string | null;
  is_active: boolean | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number | null;
  official_name: string | null;
  city: string | null;
  state: string | null;
  country: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  const fields = ["id", "displayName", "formattedAddress", "location", "rating", "userRatingCount", "primaryType", "types"];
  const url = "https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fields.join(","),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, error: `HTTP_${res.status}`, raw: json };
  return { ok: true as const, raw: json };
}

async function resolveTenantId(
  supabase: ReturnType<typeof createClient>,
  territory: TerritoryRow,
): Promise<string | null> {
  if (territory.tenant_id) return territory.tenant_id;
  const { data } = await supabase.from("blogs").select("tenant_id").eq("id", territory.blog_id).maybeSingle();
  return (data as any)?.tenant_id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const supabaseAdmin = getAdminSupabaseClient();
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: LocalSeoIntelRequest = await req.json().catch(() => ({}));
    const mode = body.mode || (body.blogId || body.territoryId ? "single" : "batch");
    const dryRun = !!body.dryRun;
    const maxBlogs = clamp(body.maxBlogs ?? 30, 1, 200);
    const maxTerritories = clamp(body.maxTerritories ?? 200, 1, 2000);

    let territories: TerritoryRow[] = [];
    if (mode === "single") {
      if (body.territoryId) {
        const { data } = await supabase
          .from("territories")
          .select("id,blog_id,tenant_id,is_active,place_id,lat,lng,radius_km,official_name,city,state,country")
          .eq("id", body.territoryId)
          .maybeSingle();
        if (data) territories = [data as any];
      } else if (body.blogId) {
        const { data } = await supabase
          .from("territories")
          .select("id,blog_id,tenant_id,is_active,place_id,lat,lng,radius_km,official_name,city,state,country")
          .eq("blog_id", body.blogId)
          .eq("is_active", true)
          .limit(maxTerritories);
        territories = (data || []) as any;
      }
    } else {
      const { data: blogs } = await supabase.from("blogs").select("id").limit(maxBlogs);
      const blogIds = (blogs || []).map((b: any) => b.id);
      if (blogIds.length > 0) {
        const { data } = await supabase
          .from("territories")
          .select("id,blog_id,tenant_id,is_active,place_id,lat,lng,radius_km,official_name,city,state,country")
          .in("blog_id", blogIds)
          .eq("is_active", true)
          .limit(maxTerritories);
        territories = (data || []) as any;
      }
    }

    if (territories.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No territories to process", processed: 0, mark: "local-seo-intel-v3" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyCache = new Map<string, string>();
    const results: any[] = [];

    for (const t of territories) {
      const placeId = t.place_id;
      if (!placeId) {
        results.push({ territory_id: t.id, blog_id: t.blog_id, skipped: true, reason: "no_place_id" });
        continue;
      }

      const tenantId = await resolveTenantId(supabase, t);

      if (dryRun) {
        results.push({ territory_id: t.id, blog_id: t.blog_id, tenant_id: tenantId, place_id: placeId, skipped: true, reason: "dry_run" });
        continue;
      }

      // Global Platform Mode: use Supabase secrets (GOOGLE_GLOBAL_API_KEY) for Places.
      // Keep cache keyed by tenantId (or 'global') to avoid repeated env reads in long loops.
      const cacheKey = tenantId || "global";
      let apiKey = keyCache.get(cacheKey) || null;
      if (!apiKey) {
        apiKey = getGlobalKey("places").apiKey;
        keyCache.set(cacheKey, apiKey);
      }

      const detail = await fetchPlaceDetails(placeId, apiKey);
      if (!detail.ok) {
        results.push({ territory_id: t.id, blog_id: t.blog_id, tenant_id: tenantId, place_id: placeId, success: false, error: detail.error });
        continue;
      }

      const raw = detail.raw as any;
      const rating = safeNumber(raw?.rating);
      const reviewsCount = safeNumber(raw?.userRatingCount);
      const locLat = safeNumber(raw?.location?.latitude);
      const locLng = safeNumber(raw?.location?.longitude);

      // Persist snapshots (best-effort)
      await supabase.from("gbp_place_snapshots").insert({
        blog_id: t.blog_id,
        territory_id: t.id,
        place_id: placeId,
        name: raw?.displayName?.text || null,
        rating,
        reviews_count: reviewsCount,
        primary_category: raw?.primaryType || null,
        categories: Array.isArray(raw?.types) ? raw.types : [],
        address: raw?.formattedAddress || null,
        lat: locLat,
        lng: locLng,
        raw,
      } as any);

      await supabase.from("gbp_review_observations").insert({
        blog_id: t.blog_id,
        territory_id: t.id,
        place_id: placeId,
        reviews_count: reviewsCount,
        rating,
      } as any);

      results.push({
        territory_id: t.id,
        blog_id: t.blog_id,
        tenant_id: tenantId,
        place_id: placeId,
        rating,
        reviews_count: reviewsCount,
        lat: locLat,
        lng: locLng,
        auth_mode: "api_key",
      });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results, mark: "local-seo-intel-v3" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", mark: "local-seo-intel-v3" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

