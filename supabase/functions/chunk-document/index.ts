import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Chunk {
  index: number;
  text: string;
  estimatedWords: number;
  suggestedTitle: string;
}

function extractSuggestedTitle(text: string, index: number): string {
  // Try to find a heading at the start of the chunk
  const lines = text.trim().split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  // Check if first line looks like a title (short, no punctuation at end, capitalized)
  if (firstLine.length > 0 && firstLine.length < 100 && !firstLine.endsWith('.')) {
    // Remove markdown headers
    const cleanTitle = firstLine.replace(/^#+\s*/, '').replace(/^[\d]+\.\s*/, '');
    if (cleanTitle.length > 5 && cleanTitle.length < 80) {
      return cleanTitle;
    }
  }
  
  // Fallback: extract key topic from first 200 chars
  const preview = text.substring(0, 200).replace(/\n/g, ' ').trim();
  const words = preview.split(/\s+/).slice(0, 6).join(' ');
  return `Seção ${index + 1}: ${words}...`;
}

function chunkByNaturalBreaks(text: string, targetChunks: number): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Patterns for detecting section breaks (chapters, numbered sections, headers)
  const sectionPatterns = [
    /\n#+\s+.+/g,                          // Markdown headers
    /\n\d+\.\s+[A-Z].+/g,                  // Numbered sections (1. Title)
    /\n[A-Z][A-Z\s]+\n/g,                  // ALL CAPS headers
    /\n[A-Z].{5,50}\n[=-]+\n/g,           // Underlined headers
    /\n\n\n+/g,                            // Multiple blank lines
  ];
  
  // Find all potential break points
  const breakPoints: number[] = [0];
  
  for (const pattern of sectionPatterns) {
    let match;
    const regex = new RegExp(pattern.source, 'gm');
    while ((match = regex.exec(text)) !== null) {
      breakPoints.push(match.index);
    }
  }
  
  // Sort and deduplicate break points
  const uniqueBreaks = [...new Set(breakPoints)].sort((a, b) => a - b);
  uniqueBreaks.push(text.length);
  
  // If we found natural breaks, use them
  if (uniqueBreaks.length > 2) {
    // Create sections from break points
    const sections: string[] = [];
    for (let i = 0; i < uniqueBreaks.length - 1; i++) {
      const section = text.substring(uniqueBreaks[i], uniqueBreaks[i + 1]).trim();
      if (section.length > 100) {
        sections.push(section);
      }
    }
    
    // Merge sections to hit target chunk count
    if (sections.length > targetChunks) {
      const mergedSections: string[] = [];
      const sectionsPerChunk = Math.ceil(sections.length / targetChunks);
      
      for (let i = 0; i < sections.length; i += sectionsPerChunk) {
        const merged = sections.slice(i, i + sectionsPerChunk).join('\n\n');
        mergedSections.push(merged);
      }
      
      return mergedSections.map((section, index) => ({
        index,
        text: section,
        estimatedWords: section.split(/\s+/).filter(w => w.length > 0).length,
        suggestedTitle: extractSuggestedTitle(section, index)
      }));
    }
    
    // Use sections as-is if close to target
    return sections.map((section, index) => ({
      index,
      text: section,
      estimatedWords: section.split(/\s+/).filter(w => w.length > 0).length,
      suggestedTitle: extractSuggestedTitle(section, index)
    }));
  }
  
  // Fallback: chunk by word count
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.ceil(words.length / targetChunks);
  
  for (let i = 0; i < targetChunks; i++) {
    const start = i * wordsPerChunk;
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunkWords = words.slice(start, end);
    
    if (chunkWords.length > 50) { // Min 50 words per chunk
      const chunkText = chunkWords.join(' ');
      chunks.push({
        index: i,
        text: chunkText,
        estimatedWords: chunkWords.length,
        suggestedTitle: extractSuggestedTitle(chunkText, i)
      });
    }
  }
  
  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetChunks = 5 } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Chunking document: ${text.length} chars, target: ${targetChunks} chunks`);
    
    // Calculate actual target chunks based on content
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const minWordsPerChunk = 500;
    const maxChunks = Math.max(1, Math.floor(wordCount / minWordsPerChunk));
    const actualTarget = Math.min(targetChunks, maxChunks);
    
    console.log(`Word count: ${wordCount}, max chunks: ${maxChunks}, actual target: ${actualTarget}`);
    
    const chunks = chunkByNaturalBreaks(text, actualTarget);
    
    console.log(`Created ${chunks.length} chunks`);
    
    return new Response(
      JSON.stringify({
        success: true,
        chunks,
        totalWords: wordCount,
        chunksCreated: chunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error chunking document:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to chunk document' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
