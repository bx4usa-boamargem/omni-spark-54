/**
 * Sync Google Place
 * 
 * Validates a territory using Google Places API and extracts
 * geographic data (lat, lng, neighborhoods) for territorial authority.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackApiUsageSafe } from "../_shared/apiUsageTracker.ts";
import { getAdminSupabaseClient } from "../_shared/getIntegrationKey.ts";
import { getGlobalKey } from "../_shared/getGlobalKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  territory_id: string;
  place_id: string;
}

interface PlaceResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address?: string;
  types?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAdmin = getAdminSupabaseClient();
    if (!supabaseAdmin) throw new Error("Missing Supabase configuration");

    const { territory_id, place_id }: SyncRequest = await req.json();

    if (!territory_id || !place_id) {
      return new Response(
        JSON.stringify({ error: "territory_id and place_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-google-place] Starting sync for territory:", territory_id, "place:", place_id);

    // Resolve tenant + blog (for API key lookup + logging)
    const { data: territory, error: territoryErr } = await supabase
      .from("territories")
      .select("radius_km,blog_id,tenant_id")
      .eq("id", territory_id)
      .single();
    if (territoryErr || !territory) {
      throw new Error("Territory not found");
    }
    const radiusKm = (territory as any)?.radius_km || 15;
    const blogId = (territory as any)?.blog_id || null;
    let tenantId: string | null = (territory as any)?.tenant_id || null;
    if (!tenantId && blogId) {
      const { data: blogRow } = await supabase.from("blogs").select("tenant_id").eq("id", blogId).maybeSingle();
      tenantId = (blogRow as any)?.tenant_id || null;
    }
    if (!tenantId) throw new Error("TENANT_CONTEXT_REQUIRED");

    // Validate auth user is member of tenant
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";
    if (!anonKey || !authHeader) throw new Error("Unauthorized: missing auth context");
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isMember } = await authClient.rpc("is_tenant_member", { p_tenant_id: tenantId });
    if (!isMember) throw new Error("Forbidden: not a tenant member");

    const { apiKey } = getGlobalKey("maps");

    // Call Google Places API - Place Details
    const fieldsParam = "geometry,name,address_components,formatted_address,types";
    const placesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fieldsParam}&key=${encodeURIComponent(apiKey)}`;

    const placesStart = Date.now();
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();
    const placesLatency = Date.now() - placesStart;

    if (placesData.status !== "OK" || !placesData.result) {
      console.error("[sync-google-place] Google API error:", placesData.status, placesData.error_message);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch place details",
          google_status: placesData.status,
          google_error: placesData.error_message
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place: PlaceResult = placesData.result;

    // Extract neighborhoods and districts from address_components
    const neighborhoodTags: string[] = [];
    const addressComponents = place.address_components || [];

    for (const component of addressComponents) {
      const types = component.types;
      
      // Extract neighborhoods, sublocalities, districts
      if (
        types.includes("neighborhood") ||
        types.includes("sublocality") ||
        types.includes("sublocality_level_1") ||
        types.includes("sublocality_level_2") ||
        types.includes("sublocality_level_3") ||
        types.includes("administrative_area_level_3") ||
        types.includes("administrative_area_level_4")
      ) {
        if (!neighborhoodTags.includes(component.long_name)) {
          neighborhoodTags.push(component.long_name);
        }
      }
    }

    // Also try to get nearby areas using Nearby Search (optional enhancement)
    const lat = place.geometry.location.lat;
    const lng = place.geometry.location.lng;

    await trackApiUsageSafe(supabase as any, {
      tenant_id: tenantId,
      blog_id: blogId,
      user_id: null,
      article_id: null,
      api_provider: "places",
      api_name: "place_details_json",
      tokens_input: null,
      tokens_output: null,
      estimated_cost_usd: 0,
      execution_time_ms: placesLatency,
      timestamp: new Date().toISOString(),
      action_type: "api_usage",
      model_used: "maps.googleapis.com/place/details",
      metadata: {
        territory_id,
        place_id,
        auth_mode: "api_key",
        status: placesData?.status || null,
      },
    });

    // Try to get additional neighborhoods via Nearby Search
    try {
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusKm * 1000}&type=neighborhood&key=${encodeURIComponent(apiKey)}`;
      const nearbyStart = Date.now();
      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();
      const nearbyLatency = Date.now() - nearbyStart;

      await trackApiUsageSafe(supabase as any, {
        tenant_id: tenantId,
        blog_id: blogId,
        user_id: null,
        article_id: null,
        api_provider: "places",
        api_name: "nearbysearch_neighborhood",
        tokens_input: null,
        tokens_output: null,
        estimated_cost_usd: 0,
        execution_time_ms: nearbyLatency,
        timestamp: new Date().toISOString(),
        action_type: "api_usage",
        model_used: "maps.googleapis.com/place/nearbysearch",
        metadata: {
          territory_id,
          place_id,
          radius_km: radiusKm,
          auth_mode: "api_key",
          status: nearbyData?.status || null,
          results_count: Array.isArray(nearbyData?.results) ? nearbyData.results.length : 0,
        },
      });

      if (nearbyData.status === "OK" && nearbyData.results) {
        for (const nearby of nearbyData.results.slice(0, 10)) {
          if (nearby.name && !neighborhoodTags.includes(nearby.name)) {
            neighborhoodTags.push(nearby.name);
          }
        }
      }
    } catch (nearbyError) {
      console.warn("[sync-google-place] Nearby search failed (non-critical):", nearbyError);
    }

    // Update territory with validated data
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("territories")
      .update({
        place_id: place_id,
        lat: lat,
        lng: lng,
        official_name: place.name,
        neighborhood_tags: neighborhoodTags,
        validated_at: now,
        updated_at: now
      })
      .eq("id", territory_id);

    if (updateError) {
      console.error("[sync-google-place] Failed to update territory:", updateError);
      throw updateError;
    }

    console.log("[sync-google-place] Successfully synced territory:", {
      territory_id,
      official_name: place.name,
      lat,
      lng,
      neighborhood_count: neighborhoodTags.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        territory_id,
        validated: true,
        official_name: place.name,
        formatted_address: place.formatted_address,
        lat,
        lng,
        neighborhood_tags: neighborhoodTags,
        validated_at: now
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sync-google-place] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
