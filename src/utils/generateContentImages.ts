import { supabase } from "@/integrations/supabase/client";
import type { ImagePrompt } from "./streamArticle";

export interface ContentImage {
  context: 'hero' | 'problem' | 'solution' | 'result';
  url: string;
  after_section: number;
}

export interface ImageGenerationProgress {
  current: number;
  total: number;
  context: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

async function generateSingleImage(prompt: string, context: string, theme: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          context,
          articleTheme: theme,
        }),
      }
    );

    if (!response.ok) {
      console.error('Image generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.imageBase64 || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

async function uploadImageToStorage(base64Data: string, fileName: string): Promise<string | null> {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('article-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

export async function generateContentImages(
  imagePrompts: ImagePrompt[],
  heroPrompt: string,
  theme: string,
  onProgress?: (progress: ImageGenerationProgress) => void
): Promise<{ heroImage: string | null; contentImages: ContentImage[] }> {
  const totalImages = 1 + imagePrompts.length; // Hero + content images
  let currentImage = 0;
  
  const contentImages: ContentImage[] = [];
  let heroImage: string | null = null;

  // Generate hero image first
  onProgress?.({ current: 1, total: totalImages, context: 'hero', status: 'generating' });
  
  const heroBase64 = await generateSingleImage(heroPrompt, 'hero', theme);
  if (heroBase64) {
    const heroFileName = `hero-${Date.now()}.png`;
    heroImage = await uploadImageToStorage(heroBase64, heroFileName);
  }
  
  onProgress?.({ current: 1, total: totalImages, context: 'hero', status: heroImage ? 'done' : 'error' });
  currentImage++;

  // Generate content images
  for (const imagePrompt of imagePrompts) {
    onProgress?.({ 
      current: currentImage + 1, 
      total: totalImages, 
      context: imagePrompt.context, 
      status: 'generating' 
    });

    const imageBase64 = await generateSingleImage(imagePrompt.prompt, imagePrompt.context, theme);
    
    if (imageBase64) {
      const fileName = `${imagePrompt.context}-${Date.now()}.png`;
      const uploadedUrl = await uploadImageToStorage(imageBase64, fileName);
      
      if (uploadedUrl) {
        contentImages.push({
          context: imagePrompt.context,
          url: uploadedUrl,
          after_section: imagePrompt.after_section
        });
      }
    }

    onProgress?.({ 
      current: currentImage + 1, 
      total: totalImages, 
      context: imagePrompt.context, 
      status: contentImages.find(c => c.context === imagePrompt.context) ? 'done' : 'error'
    });
    
    currentImage++;
  }

  return { heroImage, contentImages };
}
