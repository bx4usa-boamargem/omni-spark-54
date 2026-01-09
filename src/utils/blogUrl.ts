/**
 * Utility functions for generating blog and article URLs
 * Supports custom domain when verified, platform subdomain, and fallback paths
 */

export interface BlogWithDomain {
  slug: string;
  custom_domain?: string | null;
  domain_verified?: boolean | null;
  platform_subdomain?: string | null;
}

/**
 * Check if we're in a production Omniseen environment
 */
export function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('omniseen.app');
}

/**
 * Get the base URL for a blog
 * Priority: 1. Custom domain (if verified), 2. Platform subdomain, 3. Fallback path
 */
export function getBlogUrl(blog: BlogWithDomain): string {
  // Priority 1: Verified custom domain
  if (blog.custom_domain && blog.domain_verified) {
    return `https://${blog.custom_domain}`;
  }
  
  // Priority 2: Platform subdomain (only in production)
  if (isProductionEnvironment()) {
    const subdomain = blog.platform_subdomain || blog.slug;
    return `https://${subdomain}.omniseen.app`;
  }
  
  // Priority 3: Fallback path (for dev/preview)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/blog/${blog.slug}`;
  }
  
  return `/blog/${blog.slug}`;
}

/**
 * Get the full URL for an article
 * Priority: 1. Custom domain, 2. Platform subdomain, 3. Fallback path
 */
export function getArticleUrl(blog: BlogWithDomain, articleSlug: string): string {
  // Priority 1: Verified custom domain
  if (blog.custom_domain && blog.domain_verified) {
    return `https://${blog.custom_domain}/${articleSlug}`;
  }
  
  // Priority 2: Platform subdomain (only in production)
  if (isProductionEnvironment()) {
    const subdomain = blog.platform_subdomain || blog.slug;
    return `https://${subdomain}.omniseen.app/${articleSlug}`;
  }
  
  // Priority 3: Fallback path (for dev/preview)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/blog/${blog.slug}/${articleSlug}`;
  }
  
  return `/blog/${blog.slug}/${articleSlug}`;
}

/**
 * Get the relative path for an article link (for react-router)
 * For custom domains or platform subdomains, returns just the slug
 * For normal access, returns full /blog/slug/articleSlug path
 */
export function getArticlePath(blog: BlogWithDomain, articleSlug: string): string {
  if (isBlogDomainAccess()) {
    return `/${articleSlug}`;
  }
  
  return `/blog/${blog.slug}/${articleSlug}`;
}

/**
 * Get the relative path for blog home (for react-router)
 */
export function getBlogPath(blog: BlogWithDomain): string {
  if (isBlogDomainAccess()) {
    return `/`;
  }
  
  return `/blog/${blog.slug}`;
}

/**
 * Check if the current access is via a blog domain (custom domain or platform subdomain)
 * This is used for link generation within blog mode
 */
export function isBlogDomainAccess(): boolean {
  if (typeof window === 'undefined') return false;
  
  const host = window.location.hostname;
  
  // Development/platform hosts - never blog domain access
  const platformHosts = ['localhost', '127.0.0.1', '0.0.0.0', 'app.omniseen.app'];
  if (platformHosts.some(h => host === h || host.includes(h))) {
    return false;
  }
  
  // Lovable preview - never blog domain access
  if (host.includes('lovable.app') || host.includes('lovableproject.com')) {
    return false;
  }
  
  // Root omniseen domain - landing, not blog
  if (host === 'omniseen.app' || host === 'www.omniseen.app') {
    return false;
  }
  
  // Platform subdomain ({slug}.omniseen.app) or custom domain
  return true;
}

/**
 * Check if the current access is via a custom domain (not platform subdomain)
 */
export function isCustomDomainAccess(): boolean {
  if (typeof window === 'undefined') return false;
  
  const host = window.location.hostname;
  
  // If it ends with omniseen.app, it's not a custom domain
  if (host.endsWith('omniseen.app')) {
    return false;
  }
  
  // Check other known platform hosts
  const platformHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  if (platformHosts.some(h => host.includes(h)) || host.includes('lovable.app') || host.includes('lovableproject.com')) {
    return false;
  }
  
  // Any other domain is potentially a custom domain
  return true;
}

/**
 * Get the current hostname
 */
export function getCurrentHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
}
