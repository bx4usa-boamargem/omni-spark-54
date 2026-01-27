import { LandingPageData, BlockVisibility, DEFAULT_BLOCK_VISIBILITY } from "../types/landingPageTypes";

/**
 * Infer block visibility based on what data exists in page_data
 * Used for backward compatibility with pages that don't have block_visibility saved
 */
export function inferVisibilityFromPageData(pageData: LandingPageData): BlockVisibility {
  return {
    hero: !!pageData.hero,
    services: !!(pageData.services && pageData.services.length > 0),
    service_details: !!(pageData.service_details && pageData.service_details.length > 0),
    emergency_banner: !!pageData.emergency_banner,
    materials: !!pageData.materials,
    process_steps: !!(pageData.process_steps && pageData.process_steps.length > 0),
    why_choose_us: !!(pageData.why_choose_us && pageData.why_choose_us.length > 0),
    testimonials: !!(pageData.testimonials && pageData.testimonials.length > 0),
    areas_served: !!pageData.areas_served,
    faq: !!(pageData.faq && pageData.faq.length > 0),
    contact: !!pageData.contact,
    cta_banner: !!pageData.cta_banner,
  };
}

/**
 * Normalize page data before saving to the database
 * - Removes blocks that are hidden (visibility = false)
 * - Persists block_visibility in meta
 * - Cleans up empty arrays and undefined values
 */
export function normalizePageDataForSave(
  pageData: LandingPageData,
  visibility: BlockVisibility
): LandingPageData {
  // Deep clone to avoid mutations
  const normalized: LandingPageData = JSON.parse(JSON.stringify(pageData));

  // Persist visibility in meta
  normalized.meta = {
    ...normalized.meta,
    block_visibility: visibility,
  };

  // Remove hidden blocks
  if (!visibility.hero) delete normalized.hero;
  if (!visibility.services) delete normalized.services;
  if (!visibility.service_details) delete normalized.service_details;
  if (!visibility.emergency_banner) delete normalized.emergency_banner;
  if (!visibility.materials) delete normalized.materials;
  if (!visibility.process_steps) delete normalized.process_steps;
  if (!visibility.why_choose_us) delete normalized.why_choose_us;
  if (!visibility.testimonials) delete normalized.testimonials;
  if (!visibility.areas_served) delete normalized.areas_served;
  if (!visibility.faq) delete normalized.faq;
  if (!visibility.contact) delete normalized.contact;
  if (!visibility.cta_banner) delete normalized.cta_banner;

  // Clean up empty arrays and null/undefined values
  const keys = Object.keys(normalized) as (keyof LandingPageData)[];
  for (const key of keys) {
    const value = normalized[key];
    
    // Remove undefined/null values
    if (value === undefined || value === null) {
      delete normalized[key];
      continue;
    }
    
    // Remove empty arrays (but keep meta even if it only has visibility)
    if (Array.isArray(value) && value.length === 0 && key !== 'meta') {
      delete normalized[key];
    }
  }

  return normalized;
}

/**
 * Clean page_data object for database storage
 * Removes undefined/null fields and ensures clean JSON
 */
export function cleanPageDataForStorage(pageData: LandingPageData): LandingPageData {
  // Parse/stringify to create a clean copy without undefined values
  const cleanData = JSON.parse(JSON.stringify(pageData));
  
  // Remove any remaining undefined or null values recursively
  const cleanObject = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined || obj[key] === null) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        cleanObject(obj[key] as Record<string, unknown>);
      }
    }
  };
  
  cleanObject(cleanData);
  
  return cleanData;
}
