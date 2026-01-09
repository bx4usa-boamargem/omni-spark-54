// Shared SEO score calculation utility

export interface SEOScoreParams {
  title: string;
  metaDescription: string;
  content: string | null;
  keywords: string[];
  featuredImage?: string | null;
}

export interface SEOScoreResult {
  totalScore: number;
  details: {
    title: { score: number; max: number };
    meta: { score: number; max: number };
    keywords: { score: number; max: number };
    content: { score: number; max: number };
    density: { score: number; max: number };
    image: { score: number; max: number };
  };
}

export function calculateSEOScore(params: SEOScoreParams): SEOScoreResult {
  const { title, metaDescription, content, keywords, featuredImage } = params;
  const contentText = content || '';
  const wordCount = contentText.split(/\s+/).filter(w => w.length > 0).length;
  
  const details = {
    title: { score: 0, max: 15 },
    meta: { score: 0, max: 15 },
    keywords: { score: 0, max: 15 },
    content: { score: 0, max: 20 },
    density: { score: 0, max: 20 },
    image: { score: 0, max: 15 },
  };

  // 1. Title check (15 points max)
  const titleLength = title.length;
  const keywordInTitle = keywords.some(kw => 
    title.toLowerCase().includes(kw.toLowerCase())
  );
  
  if (titleLength >= 50 && titleLength <= 60 && keywordInTitle) {
    details.title.score = 15;
  } else if (titleLength >= 30 && titleLength <= 70) {
    details.title.score = keywordInTitle ? 10 : 8;
  } else {
    details.title.score = 5;
  }

  // 2. Meta description check (15 points max)
  const metaLength = metaDescription.length;
  const keywordInMeta = keywords.some(kw => 
    metaDescription.toLowerCase().includes(kw.toLowerCase())
  );
  
  if (metaLength >= 140 && metaLength <= 160 && keywordInMeta) {
    details.meta.score = 15;
  } else if (metaLength >= 100 && metaLength <= 160) {
    details.meta.score = keywordInMeta ? 10 : 8;
  } else {
    details.meta.score = metaLength > 0 ? 5 : 0;
  }

  // 3. Keywords check (15 points max)
  if (keywords.length >= 3 && keywords.length <= 5) {
    details.keywords.score = 15;
  } else if (keywords.length >= 1) {
    details.keywords.score = 8;
  }

  // 4. Content length check (20 points max)
  if (wordCount >= 1500 && wordCount <= 2500) {
    details.content.score = 20;
  } else if (wordCount >= 800) {
    details.content.score = 12;
  } else if (wordCount > 2500) {
    details.content.score = 18;
  } else {
    details.content.score = Math.min(wordCount / 100, 5);
  }

  // 5. Density check (20 points max)
  const contentLower = contentText.toLowerCase();
  const avgDensity = keywords.length > 0 
    ? keywords.reduce((acc, kw) => {
        const matches = contentLower.match(new RegExp(kw.toLowerCase(), 'gi'));
        return acc + ((matches?.length || 0) / Math.max(wordCount, 1)) * 100;
      }, 0) / keywords.length
    : 0;
  const mainKeywordFound = keywords.some(kw => {
    const matches = contentLower.match(new RegExp(kw.toLowerCase(), 'gi'));
    return (matches?.length || 0) >= 3;
  });
  
  if (avgDensity >= 0.5 && avgDensity <= 2.5 && mainKeywordFound) {
    details.density.score = 20;
  } else if (avgDensity > 0) {
    details.density.score = 10;
  }

  // 6. Image check (15 points max)
  if (featuredImage) {
    details.image.score = 15;
  }

  // Calculate total
  const earned = Object.values(details).reduce((acc, d) => acc + d.score, 0);
  const max = Object.values(details).reduce((acc, d) => acc + d.max, 0);
  const totalScore = Math.round((earned / max) * 100);

  return { totalScore, details };
}
