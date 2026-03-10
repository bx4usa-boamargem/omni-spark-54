import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Token Revoke Functions ───────────────────────────────────────────────────

async function revokeInstagramToken(accessToken: string) {
  // Facebook revoke — best effort, no strict check
  try {
    await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${accessToken}`, {
      method: "DELETE",
    });
  } catch { /* ignore */ }
}

async function revokeLinkedInToken(accessToken: string) {
  try {
    await fetch("https://www.linkedin.com/oauth/v2/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("LINKEDIN_CLIENT_ID") || "",
        client_secret: Deno.env.get("LINKEDIN_CLIENT_SECRET") || "",
        token: accessToken,
      }),
    });
  } catch { /* ignore */ }
}

async function revokeGoogleToken(accessToken: string) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, { method: "POST" });
  } catch { /* ignore */ }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { platform, blog_id } = await req.json();

    // Validate blog ownership
    const { data: blog } = await supabase
      .from("blogs")
      .select("id")
      .eq("id", blog_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!blog) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current credentials
    const { data: creds } = await supabase
      .from("social_credentials")
      .select("*")
      .eq("blog_id", blog_id)
      .maybeSingle();

    if (creds) {
      // Revoke token on provider (best-effort)
      if (platform === "instagram" && creds.instagram_access_token) {
        await revokeInstagramToken(creds.instagram_access_token);
      } else if (platform === "linkedin" && creds.linkedin_access_token) {
        await revokeLinkedInToken(creds.linkedin_access_token);
      } else if (platform === "google_business" && creds.google_access_token) {
        await revokeGoogleToken(creds.google_access_token);
      }

      // Null out the platform fields
      const updateData: Record<string, null | string> = { updated_at: new Date().toISOString() };
      if (platform === "instagram") {
        updateData.instagram_access_token = null;
        updateData.instagram_business_account_id = null;
        updateData.instagram_account_name = null;
        updateData.instagram_expires_at = null;
        updateData.facebook_access_token = null;
        updateData.facebook_page_id = null;
      } else if (platform === "linkedin") {
        updateData.linkedin_access_token = null;
        updateData.linkedin_refresh_token = null;
        updateData.linkedin_account_id = null;
        updateData.linkedin_account_name = null;
        updateData.linkedin_expires_at = null;
        updateData.linkedin_organization_id = null;
      } else if (platform === "google_business") {
        updateData.google_access_token = null;
        updateData.google_refresh_token = null;
        updateData.google_account_name = null;
        updateData.google_expires_at = null;
        updateData.google_business_account_id = null;
        updateData.google_business_location_id = null;
      }

      await supabase.from("social_credentials").update(updateData).eq("blog_id", blog_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("social-oauth-revoke error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
