// ============================================================
// OmniSeen — Google Places API (New) Wrapper
// Cache: Supabase places_cache (TTL 30 days)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { PlaceResult } from "../../types/agents.ts";

function buildCacheKey(keyword: string, lat: number, lng: number): string {
  return `places:${keyword.toLowerCase().trim()}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export async function searchNearby(
  keyword: string,
  lat: number,
  lng: number,
  radius_m: number = 5000
): Promise<PlaceResult[]> {
  const cacheKey = buildCacheKey(keyword, lat, lng);
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(sbUrl, sbKey);

  // Check cache (30 days)
  const { data: cached } = await sb
    .from("places_cache")
    .select("results_json, expires_at")
    .eq("cache_key", cacheKey)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached.results_json as PlaceResult[];
  }

  const apiKey = Deno.env.get("GOOGLE_PLACES_KEY");
  if (!apiKey) throw new Error("GOOGLE_PLACES_KEY not set");

  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify({
      includedTypes: ["establishment"],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radius_m,
        },
      },
      rankPreference: "RELEVANCE",
      textQuery: keyword,
    }),
  });

  if (!res.ok) throw new Error(`Places API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const places: PlaceResult[] = (data.places ?? []).map((p: Record<string, unknown>) => ({
    place_id:           p.id as string,
    name:               (p.displayName as { text: string })?.text ?? "",
    rating:             p.rating as number ?? 0,
    user_ratings_total: p.userRatingCount as number ?? 0,
    address:            p.formattedAddress as string ?? "",
    lat:                (p.location as { latitude: number })?.latitude ?? lat,
    lng:                (p.location as { longitude: number })?.longitude ?? lng,
    types:              p.types as string[] ?? [],
  }));

  // Cache for 30 days
  await sb.from("places_cache").upsert({
    cache_key:    cacheKey,
    results_json: places,
    created_at:   new Date().toISOString(),
    expires_at:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return places;
}

// Geocode city → lat/lng
export async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number }> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_KEY");
  if (!apiKey) throw new Error("GOOGLE_PLACES_KEY not set");

  const address = encodeURIComponent(`${city}, ${state}, Brazil`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding error ${res.status}`);

  const data = await res.json();
  const loc  = data.results?.[0]?.geometry?.location;
  if (!loc) throw new Error(`Cannot geocode: ${city}, ${state}`);

  return { lat: loc.lat, lng: loc.lng };
}
