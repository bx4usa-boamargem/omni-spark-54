import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LandingEvent {
  eventType: string;
  pageSection?: string;
  eventData?: Record<string, unknown>;
}

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const getOrCreateVisitorId = () => {
  const key = 'omniseen_visitor_id';
  let visitorId = localStorage.getItem(key);
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(key, visitorId);
  }
  return visitorId;
};

const getTrafficSource = () => {
  const referrer = document.referrer;
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('utm_source')) return 'paid';
  if (params.get('gclid') || params.get('fbclid')) return 'paid';
  if (!referrer) return 'direct';
  
  const referrerUrl = new URL(referrer);
  const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu'];
  const socialNetworks = ['facebook', 'twitter', 'linkedin', 'instagram', 'tiktok', 'youtube'];
  
  if (searchEngines.some(se => referrerUrl.hostname.includes(se))) return 'organic';
  if (socialNetworks.some(sn => referrerUrl.hostname.includes(sn))) return 'social';
  
  return 'referral';
};

const getUTMParam = (param: string) => {
  return new URLSearchParams(window.location.search).get(param) || undefined;
};

const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const getBrowserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
};

export const useLandingTracking = () => {
  const sessionId = useRef(generateSessionId());
  const visitorId = useRef(getOrCreateVisitorId());
  const trackedSections = useRef(new Set<string>());

  const trackEvent = useCallback(async (event: LandingEvent) => {
    try {
      await supabase.functions.invoke('track-landing', {
        body: {
          session_id: sessionId.current,
          visitor_id: visitorId.current,
          event_type: event.eventType,
          page_section: event.pageSection,
          event_data: event.eventData,
          source: getTrafficSource(),
          utm_source: getUTMParam('utm_source'),
          utm_medium: getUTMParam('utm_medium'),
          utm_campaign: getUTMParam('utm_campaign'),
          device: getDeviceType(),
          browser: getBrowserName(),
        }
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, []);

  const trackPageView = useCallback(() => {
    trackEvent({ eventType: 'page_view' });
  }, [trackEvent]);

  const trackSectionView = useCallback((section: string) => {
    if (!trackedSections.current.has(section)) {
      trackedSections.current.add(section);
      trackEvent({ eventType: 'section_view', pageSection: section });
    }
  }, [trackEvent]);

  const trackCTAClick = useCallback((ctaName: string, section?: string) => {
    trackEvent({ 
      eventType: 'cta_click', 
      pageSection: section,
      eventData: { cta_name: ctaName }
    });
  }, [trackEvent]);

  const trackPricingView = useCallback(() => {
    trackEvent({ eventType: 'pricing_view', pageSection: 'pricing' });
  }, [trackEvent]);

  const trackPlanSelect = useCallback((planName: string, planPrice?: number) => {
    trackEvent({ 
      eventType: 'plan_select', 
      pageSection: 'pricing',
      eventData: { plan_name: planName, plan_price: planPrice }
    });
  }, [trackEvent]);

  const trackSignupStart = useCallback((selectedPlan?: string) => {
    trackEvent({ 
      eventType: 'signup_start',
      eventData: { selected_plan: selectedPlan }
    });
  }, [trackEvent]);

  const trackSignupComplete = useCallback((selectedPlan?: string) => {
    trackEvent({ 
      eventType: 'signup_complete',
      eventData: { selected_plan: selectedPlan }
    });
  }, [trackEvent]);

  return {
    sessionId: sessionId.current,
    trackEvent,
    trackPageView,
    trackSectionView,
    trackCTAClick,
    trackPricingView,
    trackPlanSelect,
    trackSignupStart,
    trackSignupComplete,
  };
};

// Context for sharing tracking across components
import { createContext, useContext } from 'react';

interface LandingTrackingContextType {
  trackSectionView: (section: string) => void;
  trackCTAClick: (ctaName: string, section?: string) => void;
  trackPlanSelect: (planName: string, planPrice?: number) => void;
}

export const LandingTrackingContext = createContext<LandingTrackingContextType | null>(null);

export const useLandingTrackingContext = () => {
  const context = useContext(LandingTrackingContext);
  return context;
};
