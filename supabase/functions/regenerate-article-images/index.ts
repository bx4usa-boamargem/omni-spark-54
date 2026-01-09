import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentImage {
  context: string;
  url: string;
  after_section: number;
}

interface RegenerateRequest {
  article_id: string;
  regenerate_type: 'all' | 'cover' | 'internal';
}

// Calculate internal image count based on word count
function calculateInternalImageCount(wordCount: number): number {
  if (wordCount <= 1000) return 1;      // Short article
  if (wordCount <= 1500) return 2;      // Medium article
  return 3;                              // Long article (+1500)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { article_id, regenerate_type }: RegenerateRequest = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: 'article_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`Regenerating images for article: ${article.title} (type: ${regenerate_type})`);

    const wordCount = article.content?.split(/\s+/).length || 1000;
    const internalImageCount = calculateInternalImageCount(wordCount);
    let featuredImageUrl = article.featured_image_url;
    let contentImages: ContentImage[] = article.content_images || [];
    let imagesGenerated = 0;

    // Generate slug for file naming
    const slug = article.slug || article.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50);

    // Regenerate cover image
    if (regenerate_type === 'all' || regenerate_type === 'cover') {
      try {
        console.log('Generating cover image...');
        const coverPrompt = `Realistic photo style: professional business setting related to "${article.title}". Authentic, natural lighting, genuine workplace environment. NOT corporate stock photo.`;

        const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            prompt: coverPrompt,
            context: 'hero',
            articleTheme: article.title,
            targetAudience: 'business owners'
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
              imagesGenerated++;
              console.log('Cover image regenerated:', featuredImageUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error regenerating cover image:', error);
      }
    }

    // Regenerate internal images
    if (regenerate_type === 'all' || regenerate_type === 'internal') {
      console.log(`Generating ${internalImageCount} internal images...`);
      contentImages = [];

      // Extract H2 sections from content for context
      const h2Matches = article.content?.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
      const sections = h2Matches.map((h2: string) => h2.replace(/<[^>]*>/g, '').trim());

      for (let i = 0; i < internalImageCount; i++) {
        try {
          const sectionIndex = Math.min(i, sections.length - 1);
          const sectionContext = sections[sectionIndex] || `Section ${i + 1}`;
          
          const internalPrompt = `Realistic photo: ${sectionContext}. Related to "${article.title}". Professional, authentic scene, natural lighting.`;

          console.log(`Generating internal image ${i + 1} for: ${sectionContext}`);

          const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              prompt: internalPrompt,
              context: `section-${i + 1}`,
              articleTheme: article.title,
              targetAudience: 'business owners'
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.imageBase64) {
              const base64Data = imageData.imageBase64.replace(/^data:image\/\w+;base64,/, '');
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              const fileName = `${article.blog_id}/${slug}-section-${i + 1}-${Date.now()}.png`;
              
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
                
                contentImages.push({
                  context: sectionContext,
                  url: publicUrlData.publicUrl,
                  after_section: Math.floor((sectionIndex + 1) * (sections.length / internalImageCount))
                });
                imagesGenerated++;
                console.log(`Internal image ${i + 1} generated:`, publicUrlData.publicUrl);
              }
            }
          }
        } catch (error) {
          console.error(`Error generating internal image ${i + 1}:`, error);
        }
      }
    }

    // Update article with new images
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        featured_image_url: featuredImageUrl,
        content_images: contentImages.length > 0 ? contentImages : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', article_id);

    if (updateError) {
      throw new Error(`Failed to update article: ${updateError.message}`);
    }

    // Create notification
    await supabase
      .from('automation_notifications')
      .insert({
        user_id: article.blogs.user_id,
        blog_id: article.blog_id,
        notification_type: 'images_generated',
        title: `Imagens regeneradas`,
        message: `${imagesGenerated} imagem(ns) regenerada(s) para "${article.title}"`,
        article_id: article_id
      });

    console.log(`Successfully regenerated ${imagesGenerated} images for article ${article_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        images_generated: imagesGenerated,
        featured_image_url: featuredImageUrl,
        content_images: contentImages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in regenerate-article-images:', error);
    const message = error instanceof Error ? error.message : 'Failed to regenerate images';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
