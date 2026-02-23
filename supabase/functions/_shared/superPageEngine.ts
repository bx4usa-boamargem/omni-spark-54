/**
 * Super Page Engine — Quality gate thresholds and constants
 * Block publish when below these.
 */

export const QUALITY_GATE = {
  /** Minimum entity coverage score (0-100). Below = block publish. */
  ENTITY_COVERAGE_MIN: 60,
  /** Minimum word count for article. */
  WORD_COUNT_MIN_ARTICLE: 1200,
  /** Minimum word count for super_page. */
  WORD_COUNT_MIN_SUPER_PAGE: 2800,
  /** Minimum FAQ items. */
  FAQ_MIN_ITEMS: 3,
  /** Minimum content/semantic score (0-100). Below = block publish. */
  SEMANTIC_SCORE_MIN: 55,
} as const;

export type ContentType = 'article' | 'super_page';

export function getMinWordCount(contentType: ContentType): number {
  return contentType === 'super_page' ? QUALITY_GATE.WORD_COUNT_MIN_SUPER_PAGE : QUALITY_GATE.WORD_COUNT_MIN_ARTICLE;
}
