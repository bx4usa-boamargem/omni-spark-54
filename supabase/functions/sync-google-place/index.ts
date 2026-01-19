/**
 * Sync Google Place
 * 
 * Validates a territory using Google Places API and extracts
 * geographic data (lat, lng, neighborhoods) for territorial authority.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { territory_id, place_id }: SyncRequest = await req.json();

    if (!territory_id || !place_id) {
      return new Response(
        JSON.stringify({ error: "territory_id and place_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-google-place] Starting sync for territory:", territory_id, "place:", place_id);

    // Call Google Places API - Place Details
    const fieldsParam = "geometry,name,address_components,formatted_address,types";
    const placesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fieldsParam}&key=${GOOGLE_MAPS_API_KEY}`;

    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();

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

    // Get the territory's current radius or use default
    const { data: territory } = await supabase
      .from("territories")
      .select("radius_km")
      .eq("id", territory_id)
      .single();

    const radiusKm = territory?.radius_km || 15;

    // Try to get additional neighborhoods via Nearby Search
    try {
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusKm * 1000}&type=neighborhood&key=${GOOGLE_MAPS_API_KEY}`;
      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();

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
