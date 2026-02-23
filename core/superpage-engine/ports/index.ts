/**
 * Superpage Engine — Ports (interfaces for external services)
 * Implementations live in adapters; engine only depends on these interfaces.
 */

import type {
  SuperPageJobInput,
  SerpAnalysisResult,
  OutlineResult,
  SemanticEntities,
  ContentResult,
  ImageSlot,
  ImageResult,
  SeoScoreResult,
  PersistedArticle,
} from '../types';

/** SERP analysis provider (e.g. DataForSEO, SerpAPI, Firecrawl, or LLM fallback) */
export interface SerpPort {
  analyze(keyword: string, locale: { language: string; city?: string }): Promise<SerpAnalysisResult>;
}

/** LLM provider for outline, entities, content generation */
export interface LlmPort {
  generateOutline(
    input: SuperPageJobInput,
    serp: SerpAnalysisResult
  ): Promise<OutlineResult>;

  extractEntities(
    input: SuperPageJobInput,
    serp: SerpAnalysisResult,
    outline: OutlineResult
  ): Promise<SemanticEntities>;

  generateContent(
    input: SuperPageJobInput,
    serp: SerpAnalysisResult,
    outline: OutlineResult,
    entities: SemanticEntities,
    config: { wordCountMin: number; wordCountMax: number }
  ): Promise<ContentResult>;
}

/** Image generation provider (e.g. Gemini Nano Banana / Imagen) */
export interface ImageGenPort {
  /** Generate hero image from prompt */
  generateHero(prompt: string, options?: { alt?: string }): Promise<ImageResult>;

  /** Generate section image */
  generateSection(
    prompt: string,
    sectionIndex: number,
    options?: { alt?: string }
  ): Promise<ImageResult>;

  /** Generate multiple images (hero + sections); may be batched */
  generateAll(slots: ImageSlot[]): Promise<ImageResult[]>;
}

/** SEO scoring provider */
export interface SeoScorePort {
  score(
    content: ContentResult,
    serp?: SerpAnalysisResult
  ): Promise<SeoScoreResult>;
}

/** Persistence: save article, update status (draft/published) */
export interface StoragePort {
  saveArticle(params: {
    blogId: string;
    title: string;
    slug: string;
    content: string;
    metaDescription: string;
    faq: ContentResult['faq'];
    schemaJson?: string;
    featuredImageUrl?: string;
    featuredImageAlt?: string;
    contentImages?: ImageResult[];
    keywords: string[];
    contentType: 'super_page' | 'article';
    readingTimeMinutes?: number;
    cta?: unknown;
  }): Promise<PersistedArticle>;

  publishArticle(articleId: string): Promise<void>;
}

/** Aggregated ports for the pipeline */
export interface SuperPageEnginePorts {
  serp: SerpPort;
  llm: LlmPort;
  imageGen: ImageGenPort;
  seoScore: SeoScorePort;
  storage: StoragePort;
}
