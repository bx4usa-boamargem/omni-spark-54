import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();

    if (!code || !state) {
      throw new Error('Missing required parameters: code or state');
    }

    // Decode state to extract blogId and returnTo
    let blogId: string;
    let returnTo: string;
    try {
      const stateData = JSON.parse(decodeURIComponent(state));
      blogId = stateData.blogId;
      returnTo = stateData.returnTo || '/performance';
    } catch {
      throw new Error('Invalid state parameter');
    }

    if (!blogId) {
      throw new Error('Missing blogId in state');
    }

    // Build redirectUri from origin
    const origin = req.headers.get('origin') || 'https://ffruarbugkmetqecogdh.lovableproject.com';
    const redirectUri = `${origin}${returnTo}`;

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received successfully');

    // Get list of sites from Search Console
    const sitesResponse = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });

    if (!sitesResponse.ok) {
      console.error('Sites fetch error:', await sitesResponse.text());
      throw new Error('Failed to fetch Search Console sites');
    }

    const sitesData = await sitesResponse.json();
    const sites = sitesData.siteEntry || [];

    console.log(`Found ${sites.length} sites in Search Console`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // If only one site, auto-select it
    if (sites.length === 1) {
      const siteUrl = sites[0].siteUrl;

      const { error: upsertError } = await supabase
        .from('gsc_connections')
        .upsert({
          blog_id: blogId,
          site_url: siteUrl,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'blog_id' });

      if (upsertError) {
        console.error('Database error:', upsertError);
        throw new Error('Failed to save connection');
      }

      return new Response(JSON.stringify({
        success: true,
        connected: true,
        siteUrl,
        sites: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Multiple sites - return list for user selection
    // Store tokens temporarily
    const { error: upsertError } = await supabase
      .from('gsc_connections')
      .upsert({
        blog_id: blogId,
        site_url: 'pending_selection',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        is_active: false,
      }, { onConflict: 'blog_id' });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw new Error('Failed to save temporary connection');
    }

    return new Response(JSON.stringify({
      success: true,
      connected: false,
      sites: sites.map((s: any) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in gsc-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
