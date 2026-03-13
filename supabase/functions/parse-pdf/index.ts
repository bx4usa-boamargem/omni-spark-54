import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName } = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF: ${fileName || 'unnamed'}`);

    // Decode base64 to binary
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Simple text extraction from PDF
    // This is a basic approach that works for many PDFs with embedded text
    const pdfContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Extract text between stream/endstream markers and clean it
    let extractedText = '';
    
    // Method 1: Try to find text in content streams
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(pdfContent)) !== null) {
      const streamContent = match[1];
      
      // Look for text operators: Tj, TJ, ', "
      const textRegex = /\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ|'([^']*)'|"([^"]*)"/g;
      let textMatch;
      
      while ((textMatch = textRegex.exec(streamContent)) !== null) {
        const text = textMatch[1] || textMatch[2] || textMatch[3] || textMatch[4] || '';
        if (text.trim()) {
          // Clean up the text
          const cleaned = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ')
            .replace(/\\/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned && cleaned.length > 0) {
            extractedText += cleaned + ' ';
          }
        }
      }
    }
    
    // Method 2: If no text found, try a simpler approach
    if (!extractedText.trim()) {
      // Look for readable ASCII sequences
      const asciiRegex = /[\x20-\x7E]{10,}/g;
      const asciiMatches = pdfContent.match(asciiRegex) || [];
      
      // Filter out PDF syntax and keep only likely content
      const filteredMatches = asciiMatches.filter(text => {
        // Exclude PDF keywords and syntax
        const pdfKeywords = ['endobj', 'endstream', 'startxref', 'trailer', 'xref', '%%EOF', '/Type', '/Page', '/Font', '/Length', '/Filter'];
        const hasKeyword = pdfKeywords.some(kw => text.includes(kw));
        const isLikelyContent = /[a-zA-Z]{3,}/.test(text) && !/^[0-9\s]+$/.test(text);
        return !hasKeyword && isLikelyContent;
      });
      
      extractedText = filteredMatches.join(' ');
    }
    
    // Clean up the final text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t\u00C0-\u017F]/g, '') // Keep printable ASCII and accented chars
      .trim();

    // If still no text, the PDF might be image-based or encrypted
    if (!extractedText || extractedText.length < 50) {
      console.log('Could not extract text from PDF - might be image-based or encrypted');
      return new Response(
        JSON.stringify({ 
          text: '',
          error: 'Não foi possível extrair texto do PDF. O arquivo pode conter apenas imagens ou estar protegido.',
          wordCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wordCount = extractedText.split(/\s+/).length;
    console.log(`Extracted ${wordCount} words from PDF`);

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        wordCount,
        fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
