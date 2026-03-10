import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "linkedin" | "google_business";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface UserProfile {
  account_name?: string;
  account_id?: string;
}

// ─── Token Exchange Functions ─────────────────────────────────────────────────

async function exchangeInstagramCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("FACEBOOK_APP_ID") || "",
      client_secret: Deno.env.get("FACEBOOK_APP_SECRET") || "",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Instagram token exchange failed");

  // Exchange short-lived for long-lived token
  const longLivedResponse = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${Deno.env.get("FACEBOOK_APP_ID")}&client_secret=${Deno.env.get("FACEBOOK_APP_SECRET")}&fb_exchange_token=${data.access_token}`
  );
  const longLived = await longLivedResponse.json();
  return { access_token: longLived.access_token || data.access_token, expires_in: longLived.expires_in };
}

async function exchangeLinkedInCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: Deno.env.get("LINKEDIN_CLIENT_ID") || "",
      client_secret: Deno.env.get("LINKEDIN_CLIENT_SECRET") || "",
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error_description || "LinkedIn token exchange failed");
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error_description || "Google token exchange failed");
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
}

// ─── User Profile Fetchers ────────────────────────────────────────────────────

async function getInstagramProfile(accessToken: string): Promise<UserProfile> {
  try {
    // Get Pages connected to user
    const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}&fields=name,id,instagram_business_account`);
    const pages = await pagesResp.json();
    const pageWithIG = pages.data?.find((p: { instagram_business_account?: { id: string }; name: string; id: string }) => p.instagram_business_account);
    if (pageWithIG) {
      const igId = pageWithIG.instagram_business_account.id;
      const igResp = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=username,name&access_token=${accessToken}`);
      const ig = await igResp.json();
      return { account_name: ig.username || ig.name || pageWithIG.name, account_id: igId };
    }
    // Fallback to Facebook user
    const meResp = await fetch(`https://graph.facebook.com/v19.0/me?fields=name,id&access_token=${accessToken}`);
    const me = await meResp.json();
    return { account_name: me.name, account_id: me.id };
  } catch {
    return {};
  }
}

async function getLinkedInProfile(accessToken: string): Promise<UserProfile> {
  try {
    const resp = await fetch("https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json();
    return {
      account_name: `${data.localizedFirstName || ""} ${data.localizedLastName || ""}`.trim(),
      account_id: data.id,
    };
  } catch {
    return {};
  }
}

async function getGoogleProfile(accessToken: string): Promise<UserProfile> {
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json();
    return { account_name: data.name || data.email, account_id: data.id };
  } catch {
    return {};
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Callback from OAuth provider — receives GET with code + state
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Build redirect to the app callback page
  const appBase = Deno.env.get("APP_URL") || "https://app.omniseen.com.br";
  const callbackPage = `${appBase}/app/social/callback`;

  if (error || !code || !state) {
    const errorMsg = errorDescription || error || "Authorization denied";
    return Response.redirect(`${callbackPage}?error=${encodeURIComponent(errorMsg)}`, 302);
  }

  try {
    // Decode state
    const stateData = JSON.parse(atob(state));
    const { blog_id, user_id, platform, expires_at } = stateData;

    if (!blog_id || !user_id || !platform) {
      return Response.redirect(`${callbackPage}?error=Invalid+state`, 302);
    }

    if (Date.now() > expires_at) {
      return Response.redirect(`${callbackPage}?error=State+expired`, 302);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Redirect URI must match exactly what was used in oauth-start
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-oauth-callback`;

    // Exchange code for token
    let tokenData: TokenResponse;
    let profile: UserProfile;

    switch (platform as Platform) {
      case "instagram": {
        tokenData = await exchangeInstagramCode(code, redirectUri);
        profile = await getInstagramProfile(tokenData.access_token);
        break;
      }
      case "linkedin": {
        tokenData = await exchangeLinkedInCode(code, redirectUri);
        profile = await getLinkedInProfile(tokenData.access_token);
        break;
      }
      case "google_business": {
        tokenData = await exchangeGoogleCode(code, redirectUri);
        profile = await getGoogleProfile(tokenData.access_token);
        break;
      }
      default:
        return Response.redirect(`${callbackPage}?error=Unsupported+platform`, 302);
    }

    // Calculate expiry
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Upsert credentials (one row per blog_id)
    const credentialUpdate: Record<string, string | null> = {
      blog_id,
      updated_at: new Date().toISOString(),
    };

    if (platform === "instagram") {
      credentialUpdate.instagram_access_token = tokenData.access_token;
      credentialUpdate.instagram_business_account_id = profile.account_id || null;
      credentialUpdate.instagram_account_name = profile.account_name || null;
      credentialUpdate.instagram_expires_at = expiresAt;
      credentialUpdate.facebook_access_token = tokenData.access_token;
    } else if (platform === "linkedin") {
      credentialUpdate.linkedin_access_token = tokenData.access_token;
      credentialUpdate.linkedin_refresh_token = tokenData.refresh_token || null;
      credentialUpdate.linkedin_account_id = profile.account_id || null;
      credentialUpdate.linkedin_account_name = profile.account_name || null;
      credentialUpdate.linkedin_expires_at = expiresAt;
    } else if (platform === "google_business") {
      credentialUpdate.google_access_token = tokenData.access_token;
      credentialUpdate.google_refresh_token = tokenData.refresh_token || null;
      credentialUpdate.google_account_name = profile.account_name || null;
      credentialUpdate.google_expires_at = expiresAt;
    }

    const { error: upsertError } = await supabase
      .from("social_credentials")
      .upsert(credentialUpdate, { onConflict: "blog_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return Response.redirect(`${callbackPage}?error=Failed+to+save+credentials`, 302);
    }

    // Redirect to app with success
    return Response.redirect(`${callbackPage}?success=1&platform=${platform}&account=${encodeURIComponent(profile.account_name || platform)}`, 302);

  } catch (err) {
    console.error("social-oauth-callback error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${callbackPage}?error=${encodeURIComponent(msg)}`, 302);
  }
});
