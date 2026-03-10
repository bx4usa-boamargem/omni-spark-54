// ============================================================
// Edge Function: index-url
// POST { tenant_id, url, type? }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { submitUrl, submitIndexNow } from "../../lib/google/indexing.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb    = createClient(sbUrl, sbKey);

    const { tenant_id, url, type = "URL_UPDATED" } = await req.json() as {
      tenant_id: string;
      url:       string;
      type?:     "URL_UPDATED" | "URL_DELETED";
    };

    if (!tenant_id || !url) {
      return new Response(
        JSON.stringify({ error: "tenant_id and url are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const host = new URL(url).hostname;

    const [googleOk, indexNowOk] = await Promise.allSettled([
      submitUrl(url, type),
      submitIndexNow(url, host),
    ]);

    const result = {
      google_indexing: googleOk.status === "fulfilled" ? googleOk.value : false,
      indexnow:        indexNowOk.status === "fulfilled" ? indexNowOk.value : false,
    };

    // Log
    await sb.from("job_events").insert({
      tenant_id,
      event_type: "step_completed",
      message:    `URL indexed: ${url}`,
      data_json:  result,
      created_at: new Date().toISOString(),
    }).catch(console.error);

    return new Response(
      JSON.stringify({ success: true, ...result, url }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
