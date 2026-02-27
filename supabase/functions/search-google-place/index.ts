/**
 * Search Google Place
 * 
 * Searches for places using Google Places Autocomplete API.
 * Returns place_id suggestions for territory validation without CORS issues.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGlobalKey } from "../_shared/getGlobalKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  types?: string; // e.g., "locality|administrative_area_level_1"
  tenant_id: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface AutocompleteResponse {
  status: string;
  predictions?: PlacePrediction[];
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, types, tenant_id }: SearchRequest = await req.json();

    if (!tenant_id || tenant_id.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required", predictions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters", predictions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[search-google-place] Searching for:", query);

    // Validate user belongs to tenant (do not allow arbitrary tenant_id)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";
    if (!supabaseUrl || !anonKey || !authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing auth context", predictions: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isMember, error: memberErr } = await authClient.rpc("is_tenant_member", { p_tenant_id: tenant_id });
    if (memberErr || !isMember) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not a tenant member", predictions: [] }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apiKey } = getGlobalKey("maps");

    // Build autocomplete URL
    // Filter by types: cities, states, countries
    const typesParam = types || "(regions)"; // (regions) includes localities, sublocalities, etc.
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=${typesParam}&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(autocompleteUrl);
    const data: AutocompleteResponse = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[search-google-place] Google API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: "Failed to search places",
          google_status: data.status,
          google_error: data.error_message,
          predictions: []
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform predictions for frontend
    const predictions = (data.predictions || []).map(p => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || p.description,
      secondary_text: p.structured_formatting?.secondary_text || "",
      types: p.types || []
    }));

    console.log("[search-google-place] Found", predictions.length, "predictions");

    return new Response(
      JSON.stringify({
        success: true,
        query,
        predictions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[search-google-place] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, predictions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
