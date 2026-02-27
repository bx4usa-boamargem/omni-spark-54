import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchGoogleCustomSearchRaw, normalizeTop10Results } from "../_shared/googleSearch.ts";
import { getGlobalKey } from "../_shared/getGlobalKey.ts";
import { getGeminiModel } from "../_shared/getGeminiModel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Status = "OK" | "FAIL";

function overall(g: Status, s: Status, m: Status): "READY" | "PARTIAL" | "FAIL" {
  const oks = [g, s, m].filter((x) => x === "OK").length;
  if (oks === 3) return "READY";
  if (oks === 0) return "FAIL";
  return "PARTIAL";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Global Platform Mode: validate Google access via Supabase secrets only.
  const body = await req.json().catch(() => ({} as any));

  // 1) Gemini API (API key)
  let gemini: Status = "FAIL";
  let geminiError: string | null = null;
  let geminiHttpStatus: number | null = null;
  const geminiModel = getGeminiModel();
  try {
    const integration = getGlobalKey("gemini");
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(integration.apiKey)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 32 },
      }),
    });
    geminiHttpStatus = resp.status;
    const json = await resp.json().catch(() => ({}));
    const hasCandidate = Array.isArray((json as any)?.candidates) && (json as any).candidates.length > 0;

    if (resp.ok && hasCandidate) {
      gemini = "OK";
    } else {
      const errMessage =
        (json as any)?.error?.message
          ? String((json as any).error.message)
          : `Unexpected response`;
      geminiError = `Gemini failed: HTTP_${resp.status} model=${geminiModel} msg="${errMessage.slice(0, 200)}"`;
      console.error("[google-native-healthcheck] Gemini FAIL", {
        http_status: resp.status,
        model_used: geminiModel,
        error_message: errMessage,
      });
    }
  } catch (e) {
    geminiError = e instanceof Error ? e.message : String(e);
    console.error("[google-native-healthcheck] Gemini EXCEPTION", {
      model_used: geminiModel,
      error: geminiError,
    });
  }

  // 2) Google Custom Search (API key + CX)
  let search: Status = "FAIL";
  let searchError: string | null = null;
  try {
    const raw = await fetchGoogleCustomSearchRaw({
      // kept for backward compatibility; googleSearch ignores tenant in global mode
      supabaseAdmin: (null as any),
      tenant_id: "global",
      query: "pest control atlanta",
      hl: "en",
      gl: "us",
    });
    if (!raw.ok) {
      searchError = raw.error;
    } else {
      const top10 = normalizeTop10Results(raw.data);
      if (top10.length >= 3) search = "OK";
      else searchError = `Too few results: ${top10.length}`;
    }
  } catch (e) {
    searchError = e instanceof Error ? e.message : String(e);
  }

  // 3) Maps Static (API key)
  let maps: Status = "FAIL";
  let mapsError: string | null = null;
  try {
    const integration = getGlobalKey("maps");
    const mapUrl =
      `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent("Atlanta,GA")}` +
      `&zoom=12&size=600x400&markers=color:red%7C${encodeURIComponent("Atlanta,GA")}` +
      `&key=${encodeURIComponent(integration.apiKey)}`;
    const resp = await fetch(mapUrl, { method: "GET" });
    const ct = resp.headers.get("content-type") || "";
    if (resp.ok && ct.toLowerCase().startsWith("image/")) maps = "OK";
    else {
      const txt = await resp.text().catch(() => "");
      mapsError = `Maps Static failed: HTTP_${resp.status} content_type=${ct} body="${txt.slice(0, 160)}"`;
    }
  } catch (e) {
    mapsError = e instanceof Error ? e.message : String(e);
  }

  // 4) Places (API key)
  let places: Status = "FAIL";
  let placesError: string | null = null;
  try {
    const integration = getGlobalKey("places");
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent("Atlanta")}&types=(regions)&key=${encodeURIComponent(integration.apiKey)}`;
    const resp = await fetch(url, { method: "GET" });
    const json = await resp.json().catch(() => ({}));
    const status = String((json as any)?.status || "");
    if (resp.ok && (status === "OK" || status === "ZERO_RESULTS")) places = "OK";
    else placesError = `Places failed: HTTP_${resp.status} status=${status} error="${String((json as any)?.error_message || "").slice(0, 120)}"`;
  } catch (e) {
    placesError = e instanceof Error ? e.message : String(e);
  }

  return new Response(
    JSON.stringify({
      gemini,
      search,
      maps,
      places,
      auth_mode: "api_key",
      model_used: geminiModel,
      gemini_http_status: geminiHttpStatus,
      overall_status: overall(gemini, search, maps) === "READY" && places === "OK"
        ? "READY"
        : overall(gemini, search, maps) === "FAIL" && places === "FAIL"
          ? "FAIL"
          : "PARTIAL",
      errors: {
        gemini: gemini === "FAIL" ? geminiError : null,
        search: search === "FAIL" ? searchError : null,
        maps: maps === "FAIL" ? mapsError : null,
        places: places === "FAIL" ? placesError : null,
      },
      config: {
        has_global_key: !!Deno.env.get("GOOGLE_GLOBAL_API_KEY"),
        has_search_cx: !!Deno.env.get("GOOGLE_SEARCH_CX"),
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

