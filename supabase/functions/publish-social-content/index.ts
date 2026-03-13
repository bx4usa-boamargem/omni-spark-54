import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  social_post_id: string;
  article_url?: string;
  image_url?: string;
}

type PublishResult = {
  success: boolean;
  platform_post_id?: string;
  error?: string;
  status: 'published' | 'failed' | 'no_credentials';
};

// ─── Instagram Graph API ─────────────────────────────────────────────────────
async function publishToInstagram(
  credentials: Record<string, string | null>,
  content: Record<string, unknown>,
  imageUrl: string | undefined,
  articleUrl: string | undefined
): Promise<PublishResult> {
  const token = credentials.instagram_access_token;
  const accountId = credentials.instagram_business_account_id;

  if (!token || !accountId) {
    return { success: false, status: 'no_credentials', error: 'Instagram credentials not configured' };
  }

  try {
    const caption = [
      content.caption as string,
      ...(content.hashtags as string[] || []).map((h: string) => `#${h.replace(/^#/, '')}`),
    ].join('\n\n');

    // Create media container
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl || 'https://omniseenapp.com/og-default.png',
          caption,
          access_token: token,
        }),
      }
    );

    if (!mediaRes.ok) {
      const err = await mediaRes.json();
      return { success: false, status: 'failed', error: err.error?.message || 'Media container error' };
    }

    const { id: mediaId } = await mediaRes.json();

    // Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: mediaId, access_token: token }),
      }
    );

    if (!publishRes.ok) {
      const err = await publishRes.json();
      return { success: false, status: 'failed', error: err.error?.message || 'Publish error' };
    }

    const { id } = await publishRes.json();
    return { success: true, status: 'published', platform_post_id: id };

  } catch (e) {
    return { success: false, status: 'failed', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── LinkedIn API ─────────────────────────────────────────────────────────────
async function publishToLinkedIn(
  credentials: Record<string, string | null>,
  content: Record<string, unknown>,
  imageUrl: string | undefined,
  articleUrl: string | undefined
): Promise<PublishResult> {
  const token = credentials.linkedin_access_token;
  const orgId = credentials.linkedin_organization_id;

  if (!token || !orgId) {
    return { success: false, status: 'no_credentials', error: 'LinkedIn credentials not configured' };
  }

  try {
    const postText = [
      content.post_text,
      articleUrl ? `\n🔗 ${articleUrl}` : '',
    ].join('');

    const body: Record<string, unknown> = {
      author: `urn:li:organization:${orgId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: postText },
          shareMediaCategory: articleUrl ? 'ARTICLE' : 'NONE',
          media: articleUrl ? [
            {
              status: 'READY',
              description: { text: content.summary as string },
              originalUrl: articleUrl,
              title: { text: content.call_to_action as string },
            },
          ] : undefined,
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, status: 'failed', error: err.message || 'LinkedIn API error' };
    }

    const data = await res.json();
    return { success: true, status: 'published', platform_post_id: data.id };

  } catch (e) {
    return { success: false, status: 'failed', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── Facebook Graph API ───────────────────────────────────────────────────────
async function publishToFacebook(
  credentials: Record<string, string | null>,
  content: Record<string, unknown>,
  imageUrl: string | undefined,
  articleUrl: string | undefined
): Promise<PublishResult> {
  const token = credentials.facebook_access_token;
  const pageId = credentials.facebook_page_id;

  if (!token || !pageId) {
    return { success: false, status: 'no_credentials', error: 'Facebook credentials not configured' };
  }

  try {
    const message = `${content.post_text}\n\n${articleUrl || ''}`.trim();

    const body: Record<string, string> = { message, access_token: token };
    if (articleUrl) body.link = articleUrl;

    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, status: 'failed', error: err.error?.message || 'Facebook API error' };
    }

    const data = await res.json();
    return { success: true, status: 'published', platform_post_id: data.id };

  } catch (e) {
    return { success: false, status: 'failed', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── Google Business Profile API ──────────────────────────────────────────────
async function publishToGoogleBusiness(
  credentials: Record<string, string | null>,
  content: Record<string, unknown>,
  imageUrl: string | undefined,
  articleUrl: string | undefined
): Promise<PublishResult> {
  const token = credentials.google_business_access_token;
  const accountId = credentials.google_business_account_id;
  const locationId = credentials.google_business_location_id;

  if (!token || !accountId || !locationId) {
    return { success: false, status: 'no_credentials', error: 'Google Business credentials not configured' };
  }

  try {
    const callToActionType = (content.call_to_action as string) || 'LEARN_MORE';
    const ctaUrl = (content.call_to_action_url as string) || articleUrl;

    const postBody: Record<string, unknown> = {
      languageCode: 'pt-BR',
      summary: content.summary as string,
      callToAction: {
        actionType: callToActionType,
        url: ctaUrl,
      },
      topicType: 'STANDARD',
    };

    if (imageUrl) {
      postBody.media = [{ mediaFormat: 'PHOTO', sourceUrl: imageUrl }];
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return { success: false, status: 'failed', error: err.error?.message || 'Google Business API error' };
    }

    const data = await res.json();
    return { success: true, status: 'published', platform_post_id: data.name };

  } catch (e) {
    return { success: false, status: 'failed', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { social_post_id, article_url, image_url }: PublishRequest = await req.json();

    if (!social_post_id) {
      return new Response(JSON.stringify({ error: 'social_post_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Buscar o social_post
    const { data: socialPost, error: postError } = await supabase
      .from('social_posts')
      .select('*, articles(featured_image_url, slug, blog_id)')
      .eq('id', social_post_id)
      .single();

    if (postError || !socialPost) {
      return new Response(JSON.stringify({ error: 'Social post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verificar ownership
    const { data: blog } = await supabase
      .from('blogs')
      .select('id, user_id')
      .eq('id', socialPost.blog_id)
      .single();

    if (!blog || blog.user_id !== user.id) {
      // Verificar se é admin do blog
      const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('blog_id', socialPost.blog_id)
        .eq('user_id', user.id)
        .single();

      if (!member || !['admin', 'editor'].includes(member.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Buscar credenciais do blog
    const { data: credentials } = await supabase
      .from('social_credentials')
      .select('*')
      .eq('blog_id', socialPost.blog_id)
      .single();

    const creds = credentials || {};
    const postContent = socialPost.content as Record<string, unknown>;
    const resolvedImageUrl = image_url || (socialPost.articles as Record<string, string | null>)?.featured_image_url || undefined;
    const resolvedArticleUrl = article_url || undefined;

    // 4. Publicar na plataforma correta
    let result: PublishResult;

    switch (socialPost.platform) {
      case 'instagram':
        result = await publishToInstagram(creds, postContent, resolvedImageUrl, resolvedArticleUrl);
        break;
      case 'linkedin':
        result = await publishToLinkedIn(creds, postContent, resolvedImageUrl, resolvedArticleUrl);
        break;
      case 'facebook':
        result = await publishToFacebook(creds, postContent, resolvedImageUrl, resolvedArticleUrl);
        break;
      case 'google_business':
        result = await publishToGoogleBusiness(creds, postContent, resolvedImageUrl, resolvedArticleUrl);
        break;
      default:
        result = { success: false, status: 'failed', error: `Unknown platform: ${socialPost.platform}` };
    }

    // 5. Atualizar status no banco
    await supabase
      .from('social_posts')
      .update({
        status: result.status === 'no_credentials' ? 'draft' : result.status,
        published_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
      })
      .eq('id', social_post_id);

    return new Response(JSON.stringify({
      success: result.success,
      platform: socialPost.platform,
      status: result.status,
      platform_post_id: result.platform_post_id,
      error: result.error,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('publish-social-content error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
