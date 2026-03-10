import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Platform OAuth Configs ───────────────────────────────────────────────────

type Platform = "instagram" | "linkedin" | "google_business";

function getOAuthConfig(platform: Platform, redirectUri: string) {
  const configs: Record<Platform, { url: string; params: Record<string, string> }> = {
    instagram: {
      url: "https://www.facebook.com/v19.0/dialog/oauth",
      params: {
        client_id: Deno.env.get("FACEBOOK_APP_ID") || "",
        redirect_uri: redirectUri,
        scope: [
          "instagram_basic",
          "instagram_content_publish",
          "instagram_manage_insights",
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
        ].join(","),
        response_type: "code",
      },
    },
    linkedin: {
      url: "https://www.linkedin.com/oauth/v2/authorization",
      params: {
        client_id: Deno.env.get("LINKEDIN_CLIENT_ID") || "",
        redirect_uri: redirectUri,
        scope: [
          "openid",
          "profile",
          "email",
          "w_member_social",
          "r_organization_social",
          "w_organization_social",
        ].join(" "),
        response_type: "code",
      },
    },
    google_business: {
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      params: {
        client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
        redirect_uri: redirectUri,
        scope: [
          "https://www.googleapis.com/auth/business.manage",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
          "openid",
        ].join(" "),
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
      },
    },
  };
  return configs[platform];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (!platform || !blog_id) {
      return new Response(JSON.stringify({ error: "Missing platform or blog_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify blog ownership
    const { data: blog, error: blogError } = await supabase
      .from("blogs")
      .select("id")
      .eq("id", blog_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (blogError || !blog) {
      return new Response(JSON.stringify({ error: "Blog not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate anti-CSRF state token
    const stateData = {
      blog_id,
      user_id: user.id,
      platform,
      nonce: crypto.randomUUID(),
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    const state = btoa(JSON.stringify(stateData));

    // Build redirect URI (points to our callback Edge Function)
    const callbackBaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${callbackBaseUrl}/functions/v1/social-oauth-callback`;

    const config = getOAuthConfig(platform as Platform, redirectUri);
    if (!config) {
      return new Response(JSON.stringify({ error: "Unsupported platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check that client_id is configured
    if (!config.params.client_id) {
      return new Response(
        JSON.stringify({
          error: `${platform} OAuth not configured. Please set the app credentials in Supabase secrets.`,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build OAuth URL
    const params = new URLSearchParams({ ...config.params, state });
    const oauthUrl = `${config.url}?${params.toString()}`;

    return new Response(JSON.stringify({ oauth_url: oauthUrl, state }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("social-oauth-start error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
