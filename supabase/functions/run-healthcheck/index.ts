import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Requirement: internal invoke via localhost, no Authorization header
    const upstream = await fetch("http://localhost/functions/v1/google-native-healthcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const body = await upstream.text();
    const headers = new Headers(upstream.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", headers.get("content-type") || "application/json");

    return new Response(body, {
      status: upstream.status,
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_INVOKE_FAILED",
        message: msg,
        attempted_url: "http://localhost/functions/v1/google-native-healthcheck",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

