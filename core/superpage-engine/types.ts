/**
 * Superpage Engine — Domain types
 * No legacy dependencies. Used by pipeline and steps.
 */

export type ContentType = 'super_page' | 'article';

export interface Locale {
  language: string;
  country?: string;
  city?: string;
}

export interface SuperPageJobInput {
  keyword: string;
  blogId: string;
  contentType: ContentType;
  locale: Locale;
  niche: string;
  /** Optional: existing cluster/pillar context */
  clusterId?: string;
  /** Optional: editorial overrides */
  editorialContext?: {
    businessName?: string;
    cta?: { type: string; value: string; label?: string };
    tone?: string;
    mandatorySections?: string[];
  };
}

/** SERP analysis result — used by outline and content steps */
export interface SerpAnalysisResult {
  keyword: string;
  topTitles: string[];
  commonTerms: string[];
  contentGaps: string[];
  avgWordCount: number;
  avgH2Count: number;
  searchIntent: string;
  competitors?: Array<{ url: string; title: string }>;
  rawSummary?: string;
}

/** Outline: H1 + H2[] with H3[] children */
export interface OutlineSection {
  title: string;
  h3: string[];
}

export interface OutlineResult {
  h1: string;
  h2: OutlineSection[];
  metaDescription?: string;
  cta?: string;
}

/** Semantic entities extracted for content and internal linking */
export interface SemanticEntities {
  topics: string[];
  terms: string[];
  places?: string[];
  entities?: string[];
}

/** Generated content (HTML + metadata) */
export interface ContentResult {
  title: string;
  htmlContent: string;
  metaDescription: string;
  faq: Array<{ question: string; answer: string }>;
  wordCount: number;
  schemaFaq?: string; // JSON-LD string
}

/** Image slot: hero or section */
export interface ImageSlot {
  context: 'hero' | 'section';
  sectionIndex?: number;
  prompt: string;
  alt?: string;
}

export interface ImageResult {
  context: 'hero' | 'section';
  sectionIndex?: number;
  url: string;
  alt: string;
}

/** SEO score result */
export interface SeoScoreResult {
  score: number;
  breakdown?: Record<string, number>;
  suggestions?: string[];
}

/** Persisted article reference (from storage port) */
export interface PersistedArticle {
  id: string;
  slug: string;
  status: 'draft' | 'published';
}

/** Pipeline context — passed through steps; mutable accumulation */
export interface PipelineContext {
  jobId: string;
  input: SuperPageJobInput;
  /** Set by each step */
  serp?: SerpAnalysisResult;
  outline?: OutlineResult;
  entities?: SemanticEntities;
  content?: ContentResult;
  imageSlots?: ImageSlot[];
  imageResults?: ImageResult[];
  seoScore?: SeoScoreResult;
  article?: PersistedArticle;
  /** Cost/timing (optional) */
  totalCostUsd?: number;
  stepDurations?: Record<string, number>;
}

/** Result of a single pipeline step */
export type StepResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** Step name — must match pipeline order */
export type StepName =
  | 'SERP_ANALYSIS'
  | 'OUTLINE_GEN'
  | 'ENTITIES'
  | 'CONTENT_GEN'
  | 'IMAGES_GEN'
  | 'SEO_SCORE'
  | 'SAVE'
  | 'PUBLISH';

export interface PipelineConfig {
  contentType: ContentType;
  /** Target word count range */
  wordCountMin: number;
  wordCountMax: number;
  /** Generate section images (hero + N sections) */
  generateSectionImages: boolean;
  /** Max section images */
  maxSectionImages: number;
  /** Run SEO score step */
  runSeoScore: boolean;
  /** Publish immediately after save (else draft) */
  publishAfterSave: boolean;
}
