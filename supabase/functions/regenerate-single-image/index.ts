import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentImage {
  context: string;
  url: string;
  after_section: number;
}

interface RegenerateSingleRequest {
  article_id: string;
  image_type: 'cover' | 'internal';
  image_index?: number;
  context?: string;
  category?: string;
}

// Visual profile by category - ensures each category has distinct visual identity
function getVisualProfile(category: string | null): string {
  const profiles: Record<string, string> = {
    'SEO': 'Color palette: blue and green tones. Focus: search results, analytics dashboards, growth charts, Google-like interfaces.',
    'Automação': 'Color palette: purple and cyan. Focus: workflow diagrams, robots, conveyor systems, gears, connected nodes.',
    'Marketing': 'Color palette: orange and coral. Focus: megaphones, social media icons, campaigns, audience engagement.',
    'Inteligência Artificial': 'Color palette: deep blue and neon. Focus: neural networks, data streams, futuristic interfaces, AI assistants.',
    'Vendas': 'Color palette: green and gold. Focus: handshakes, contracts, money flow, celebrations, deal closing.',
    'Produtividade': 'Color palette: teal and white. Focus: organized desks, checklists, timers, clean spaces, time management.',
    'Tecnologia': 'Color palette: dark gray and electric blue. Focus: devices, code, servers, innovation, modern tech.',
    'Negócios': 'Color palette: navy and silver. Focus: buildings, charts, meetings, strategy boards, professional settings.'
  };
  
  return profiles[category || ''] || profiles['Negócios'];
}

// Anti-clone rules to prevent repeated faces
const ANTI_CLONE_RULES = `
MANDATORY VISUAL RULES (ANTI-CLONE SYSTEM):

❌ ABSOLUTELY FORBIDDEN:
- Repeated faces in the same image
- Cloned or similar-looking people
- Close-up portraits of faces
- Generic stock photo poses
- Same person appearing twice

✅ REQUIRED VISUAL APPROACH:
- Focus on ENVIRONMENTS: workspaces, screens, dashboards
- Show HANDS interacting with technology
- Emphasize OBJECTS: computers, phones, documents
- Use ABSTRACT concepts when possible
- Wide shots showing context, not faces
- If people appear, show them from behind or partial view
- Each image must be visually distinct
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { article_id, image_type, image_index, context, category }: RegenerateSingleRequest = await req.json();

    if (!article_id || !image_type) {
      return new Response(
        JSON.stringify({ error: 'article_id and image_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REGEN-SINGLE] Starting: type=${image_type}, index=${image_index}, article=${article_id}`);

    // Fetch article with blog info
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select(`
        *,
        blogs (
          id,
          user_id,
          slug
        )
      `)
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business profile for context
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('niche, company_name, target_audience')
      .eq('blog_id', article.blog_id)
      .maybeSingle();

    const businessNiche = businessProfile?.niche || 'serviços profissionais';
    const targetAudience = businessProfile?.target_audience || 'empresários e gestores';

    // Get visual profile based on category
    const articleCategory = category || article.category;
    const visualProfile = getVisualProfile(articleCategory);

    // Generate unique seed for this regeneration
    const uniqueSeed = crypto.randomUUID().substring(0, 8);

    // Generate slug for file naming
    const slug = article.slug || article.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50);

    let featuredImageUrl = article.featured_image_url;
    let contentImages: ContentImage[] = Array.isArray(article.content_images) 
      ? (article.content_images as ContentImage[]) 
      : [];

    // Build the prompt with anti-clone rules
    const buildPrompt = (type: string, sectionContext?: string) => {
      const contextInstructions: Record<string, string> = {
        cover: 'Hero image representing the main theme. Impactful and memorable. Wide establishing shot.',
        problem: 'Show frustration, chaos, or difficulty through environment and objects, NOT faces.',
        solution: 'Show technology, organization, and improvement through screens and workspaces.',
        result: 'Show success through metrics, dashboards, organized spaces, positive outcomes.',
      };

      return `
${ANTI_CLONE_RULES}

VISUAL PROFILE FOR THIS ARTICLE:
${visualProfile}

VISUAL SEED: ${uniqueSeed}
This seed ensures unique visual identity. No repetition from other images.

SCENE TYPE: ${contextInstructions[type] || contextInstructions.cover}

ARTICLE TITLE: "${article.title}"
${sectionContext ? `SECTION CONTEXT: "${sectionContext}"` : ''}

BUSINESS NICHE: ${businessNiche}
TARGET AUDIENCE: ${targetAudience}

STYLE REQUIREMENTS:
- Photorealistic professional photography style (Forbes, HBR)
- 16:9 aspect ratio for web
- Natural lighting, modern aesthetic
- NO text, logos, or watermarks
- Focus on ENVIRONMENT and OBJECTS, not faces
- Avoid close-up portraits
- Show workspaces, screens, hands, technology
- Each regenerated image must look different

The image must look like a real photograph, NOT an artificial illustration.
`.trim();
    };

    if (image_type === 'cover') {
      // Regenerate cover image
      try {
        console.log('[REGEN-SINGLE] Generating cover with anti-clone rules...');
        
        const coverPrompt = buildPrompt('cover');

        const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            prompt: coverPrompt,
            context: 'cover',
            articleTitle: article.title,
            targetAudience: targetAudience
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.imageBase64) {
            const base64Data = imageData.imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            const fileName = `${article.blog_id}/${slug}-hero-${Date.now()}.png`;
            
            const { error: uploadError } = await supabase.storage
              .from('article-images')
              .upload(fileName, binaryData, {
                contentType: 'image/png',
                upsert: false
              });

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('article-images')
                .getPublicUrl(fileName);
              
              featuredImageUrl = publicUrlData.publicUrl;
              
              // Update article
              await supabase
                .from('articles')
                .update({
                  featured_image_url: featuredImageUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', article_id);

              console.log('[REGEN-SINGLE] Cover regenerated:', featuredImageUrl);
            }
          }
        }
      } catch (error) {
        console.error('[REGEN-SINGLE] Error regenerating cover:', error);
        throw error;
      }
    } else if (image_type === 'internal' && image_index !== undefined) {
      // Regenerate specific internal image
      try {
        const imageContext = context || contentImages[image_index]?.context || 'solution';
        const contextType = imageContext.toLowerCase().includes('problem') ? 'problem' 
          : imageContext.toLowerCase().includes('result') ? 'result' 
          : 'solution';
        
        console.log(`[REGEN-SINGLE] Generating internal image ${image_index} (${contextType})...`);
        
        const internalPrompt = buildPrompt(contextType, imageContext);

        const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            prompt: internalPrompt,
            context: contextType,
            articleTitle: article.title,
            targetAudience: targetAudience
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.imageBase64) {
            const base64Data = imageData.imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            const fileName = `${article.blog_id}/${slug}-section-${image_index + 1}-${Date.now()}.png`;
            
            const { error: uploadError } = await supabase.storage
              .from('article-images')
              .upload(fileName, binaryData, {
                contentType: 'image/png',
                upsert: false
              });

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('article-images')
                .getPublicUrl(fileName);
              
              // Update the specific image in the array
              if (contentImages[image_index]) {
                contentImages[image_index] = {
                  ...contentImages[image_index],
                  url: publicUrlData.publicUrl,
                };
              } else {
                contentImages.push({
                  context: imageContext,
                  url: publicUrlData.publicUrl,
                  after_section: image_index + 1
                });
              }
              
              // Update article
              await supabase
                .from('articles')
                .update({
                  content_images: contentImages,
                  updated_at: new Date().toISOString()
                })
                .eq('id', article_id);

              console.log(`[REGEN-SINGLE] Internal image ${image_index} regenerated:`, publicUrlData.publicUrl);
            }
          }
        }
      } catch (error) {
        console.error('[REGEN-SINGLE] Error regenerating internal image:', error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        featured_image_url: featuredImageUrl,
        content_images: contentImages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[REGEN-SINGLE] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to regenerate image';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
