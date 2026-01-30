/**
 * Hook for polling article images when images_pending = true
 * 
 * Used in the article editor to auto-refresh images
 * when they're being generated in the background.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentImage {
  context: string;
  url: string;
  after_section: number;
}

interface ImagePollingResult {
  featuredImageUrl: string | null;
  contentImages: ContentImage[];
  imagesCompleted: number;
  imagesTotal: number;
  imagesPending: boolean;
}

interface UseImagePollingOptions {
  articleId: string | null;
  enabled: boolean;
  intervalMs?: number;
  onImagesReady?: () => void;
}

export function useImagePolling({
  articleId,
  enabled,
  intervalMs = 10000,
  onImagesReady
}: UseImagePollingOptions) {
  const [result, setResult] = useState<ImagePollingResult>({
    featuredImageUrl: null,
    contentImages: [],
    imagesCompleted: 0,
    imagesTotal: 0,
    imagesPending: false
  });
  const [isPolling, setIsPolling] = useState(false);
  const previousPendingRef = useRef<boolean>(false);

  const pollImages = useCallback(async () => {
    if (!articleId) return;

    try {
      // Use type assertion since image_prompts may not be in generated types
      const { data, error } = await (supabase as any)
        .from('articles')
        .select('featured_image_url, content_images, images_completed, images_total, images_pending')
        .eq('id', articleId)
        .single();

      if (error) {
        console.warn('[ImagePolling] Poll error:', error);
        return;
      }

      if (!data) return;

      // Extract content images
      let contentImages: ContentImage[] = [];
      if (Array.isArray(data.content_images)) {
        contentImages = (data.content_images as any[])
          .filter((p: any) => p.url)
          .map((p: any) => ({
            context: p.context || 'image',
            url: p.url,
            after_section: p.after_section || 0
          }));
      }

      const wasPending = previousPendingRef.current;
      const nowPending = data.images_pending || false;
      previousPendingRef.current = nowPending;

      setResult({
        featuredImageUrl: data.featured_image_url || null,
        contentImages,
        imagesCompleted: data.images_completed || 0,
        imagesTotal: data.images_total || 0,
        imagesPending: nowPending
      });

      // Notify when images become ready
      if (wasPending && !nowPending) {
        onImagesReady?.();
      }

    } catch (err) {
      console.error('[ImagePolling] Exception:', err);
    }
  }, [articleId, onImagesReady]);

  useEffect(() => {
    if (!enabled || !articleId) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    
    // Initial poll
    pollImages();

    // Set up interval
    const interval = setInterval(pollImages, intervalMs);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [enabled, articleId, intervalMs, pollImages]);

  return {
    ...result,
    isPolling,
    refresh: pollImages
  };
}
