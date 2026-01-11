/**
 * Image utility functions for safe base64/data URL handling
 * Prevents prefix duplication and provides consistent blob conversion
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Normalizes a base64 string to a proper data URL
 * Prevents double-prefixing (data:image/...;base64,data:image/...;base64,...)
 */
export function normalizeBase64ToDataUrl(base64: string): string {
  if (!base64) return '';
  
  // If already a proper data URL, return as-is
  if (base64.startsWith('data:image/') && !base64.includes('data:image/', 20)) {
    return base64;
  }
  
  // Remove any existing data URL prefixes (handles double-prefix case)
  let cleanBase64 = base64;
  while (cleanBase64.includes('data:image/')) {
    cleanBase64 = cleanBase64.replace(/^data:image\/[^;]+;base64,/, '');
  }
  
  // Add single clean prefix
  return `data:image/png;base64,${cleanBase64}`;
}

/**
 * Converts base64/data URL string to Blob safely
 * Handles prefix normalization automatically
 */
export async function base64ToBlob(base64: string): Promise<Blob> {
  const dataUrl = normalizeBase64ToDataUrl(base64);
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Extracts the image URL from an API response, normalizing if needed
 * Returns publicUrl if available, otherwise normalizes base64
 */
export function extractImageUrl(response: { imageUrl?: string; publicUrl?: string; imageBase64?: string }): string | null {
  // Prefer publicUrl (from storage) over base64
  if (response.publicUrl) {
    return response.publicUrl;
  }
  if (response.imageUrl) {
    return response.imageUrl;
  }
  if (response.imageBase64) {
    return normalizeBase64ToDataUrl(response.imageBase64);
  }
  return null;
}

/**
 * Uploads a base64 image to Supabase Storage and returns the public URL
 * This is a fallback for when the edge function doesn't handle upload
 */
export async function uploadImageToStorage(
  base64: string,
  fileName: string,
  bucket: string = 'article-images'
): Promise<string | null> {
  try {
    const blob = await base64ToBlob(base64);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, { 
        contentType: 'image/png', 
        upsert: true 
      });

    if (error) {
      console.error('[uploadImageToStorage] Upload failed:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log('[uploadImageToStorage] Success:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[uploadImageToStorage] Error:', error);
    return null;
  }
}

/**
 * Updates article image URL in database
 */
export async function updateArticleImage(
  articleId: string,
  imageType: 'cover' | 'content',
  imageUrl: string,
  contentImages?: Array<{ context: string; url: string; after_section: number }>
): Promise<boolean> {
  try {
    if (imageType === 'cover') {
      const { error } = await supabase
        .from('articles')
        .update({ 
          featured_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);
      
      if (error) throw error;
      console.log('[updateArticleImage] Cover updated for article:', articleId);
    } else if (imageType === 'content' && contentImages) {
      const { error } = await supabase
        .from('articles')
        .update({ 
          content_images: contentImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);
      
      if (error) throw error;
      console.log('[updateArticleImage] Content images updated for article:', articleId);
    }
    return true;
  } catch (error) {
    console.error('[updateArticleImage] Error:', error);
    return false;
  }
}
