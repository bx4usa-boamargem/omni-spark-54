import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RoutingMode = 'landing' | 'platform' | 'blog';

interface UseHostRoutingResult {
  mode: RoutingMode;
  loading: boolean;
  blogId: string | null;
  blogSlug: string | null;
}

/**
 * Hook that determines if the current hostname should serve:
 * - 'landing': Public marketing site (omniseen.app, www.omniseen.app)
 * - 'platform': Authenticated app (app.omniseen.app or localhost)
 * - 'blog': Platform subdomain blogs ({slug}.omniseen.app) or verified custom domain blogs
 */
export function useHostRouting(): UseHostRoutingResult {
  const [mode, setMode] = useState<RoutingMode>('platform');
  const [loading, setLoading] = useState(true);
  const [blogId, setBlogId] = useState<string | null>(null);
  const [blogSlug, setBlogSlug] = useState<string | null>(null);

  useEffect(() => {
    const checkHostname = async () => {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      
      console.log('[useHostRouting] Checking hostname:', hostname);
      
      // Development hosts - platform mode
      const devHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (devHosts.some(h => hostname.includes(h))) {
        console.log('[useHostRouting] Development host detected -> platform mode');
        setMode('platform');
        setLoading(false);
        return;
      }
      
      // Lovable preview - platform mode
      if (hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
        console.log('[useHostRouting] Lovable preview detected -> platform mode');
        setMode('platform');
        setLoading(false);
        return;
      }
      
      // OMNISEEN root domain = Landing Page (public marketing site)
      if (hostname === 'omniseen.app' || hostname === 'www.omniseen.app') {
        console.log('[useHostRouting] Root domain detected -> landing mode');
        setMode('landing');
        setLoading(false);
        return;
      }
      
      // OMNISEEN app subdomain = Platform (authenticated dashboard)
      if (hostname === 'app.omniseen.app') {
        console.log('[useHostRouting] App subdomain detected -> platform mode');
        setMode('platform');
        setLoading(false);
        return;
      }
      
      // Check for platform subdomains ({slug}.omniseen.app)
      const platformSubdomainMatch = hostname.match(/^([a-z0-9-]+)\.omniseen\.app$/i);
      if (platformSubdomainMatch) {
        const slug = platformSubdomainMatch[1];
        console.log('[useHostRouting] Platform subdomain detected:', slug);
        
        // Verify blog exists with this slug or platform_subdomain
        try {
          const { data, error } = await supabase
            .from('blogs')
            .select('id, slug')
            .or(`slug.eq.${slug},platform_subdomain.eq.${slug}`)
            .maybeSingle();
          
          if (error) {
            console.error('[useHostRouting] Error checking blog:', error);
            setMode('landing');
          } else if (data) {
            console.log('[useHostRouting] Blog found for subdomain:', data.id);
            setMode('blog');
            setBlogId(data.id);
            setBlogSlug(data.slug);
          } else {
            console.log('[useHostRouting] No blog found for subdomain, fallback to landing');
            setMode('landing');
          }
        } catch (err) {
          console.error('[useHostRouting] Error in subdomain check:', err);
          setMode('landing');
        }
        
        setLoading(false);
        return;
      }
      
      // For any other hostname, check if it's a verified blog custom domain
      try {
        console.log('[useHostRouting] Checking custom domain:', hostname);
        const { data, error } = await supabase
          .from('blogs')
          .select('id, slug')
          .eq('custom_domain', hostname)
          .eq('domain_verified', true)
          .maybeSingle();
        
        if (error) {
          console.error('[useHostRouting] Error checking blog domain:', error);
          setMode('landing');
        } else if (data) {
          console.log('[useHostRouting] Custom domain blog found:', data.id);
          setMode('blog');
          setBlogId(data.id);
          setBlogSlug(data.slug);
        } else {
          console.log('[useHostRouting] Unknown domain, fallback to landing');
          setMode('landing');
        }
      } catch (err) {
        console.error('[useHostRouting] Error in hostname routing check:', err);
        setMode('landing');
      }
      
      setLoading(false);
    };
    
    checkHostname();
  }, []);
  
  return { mode, loading, blogId, blogSlug };
}
