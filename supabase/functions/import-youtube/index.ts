import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  transcript: string;
  type: 'video' | 'shorts';
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Detect if URL is a shorts video
function isShorts(url: string): boolean {
  return url.includes('/shorts/');
}

// Fetch transcript using a free transcript API
async function fetchTranscript(videoId: string): Promise<string> {
  try {
    // Try using youtube-transcript-api via a proxy service
    const response = await fetch(`https://yt.lemnoslife.com/videos?part=snippet&id=${videoId}`);
    
    if (!response.ok) {
      console.log('Primary transcript API failed, trying alternative...');
      throw new Error('Primary API failed');
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      // This gives us video info, but we need transcript
      // Try to get captions using another approach
      const captionsResponse = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`
      );
      
      const html = await captionsResponse.text();
      
      // Extract captions URL from the page
      const captionsMatch = html.match(/"captionTracks":\[(.*?)\]/);
      
      if (captionsMatch) {
        const captionsData = JSON.parse(`[${captionsMatch[1]}]`);
        const captionTrack = captionsData.find((c: { languageCode: string }) => 
          c.languageCode === 'pt' || c.languageCode === 'pt-BR'
        ) || captionsData[0];
        
        if (captionTrack?.baseUrl) {
          const transcriptResponse = await fetch(captionTrack.baseUrl);
          const transcriptXml = await transcriptResponse.text();
          
          // Parse XML to extract text
          const textMatches = transcriptXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
          const transcriptParts: string[] = [];
          
          for (const match of textMatches) {
            // Decode HTML entities
            const text = match[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\n/g, ' ');
            transcriptParts.push(text);
          }
          
          return transcriptParts.join(' ');
        }
      }
    }
    
    throw new Error('Could not extract transcript');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    
    // Fallback: try to get at least the description
    try {
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        return `Título: ${oembedData.title}\nAutor: ${oembedData.author_name}\n\n(Transcrição automática não disponível para este vídeo. Por favor, forneça o conteúdo manualmente.)`;
      }
    } catch {
      // Ignore
    }
    
    return '';
  }
}

// Fetch video metadata using oEmbed API (no API key needed)
async function fetchVideoInfo(videoId: string, url: string): Promise<Partial<YouTubeVideoInfo>> {
  try {
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!oembedResponse.ok) {
      throw new Error('Failed to fetch video info');
    }
    
    const data = await oembedResponse.json();
    
    return {
      videoId,
      title: data.title || '',
      channelTitle: data.author_name || '',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      type: isShorts(url) ? 'shorts' : 'video',
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return {
      videoId,
      title: '',
      channelTitle: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      type: isShorts(url) ? 'shorts' : 'video',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL do YouTube é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing YouTube URL:', url);

    // Extract video ID
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'URL do YouTube inválida. Use o formato: youtube.com/watch?v=ID ou youtu.be/ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video ID extracted:', videoId);

    // Fetch video info and transcript in parallel
    const [videoInfo, transcript] = await Promise.all([
      fetchVideoInfo(videoId, url),
      fetchTranscript(videoId),
    ]);

    console.log('Video info fetched:', videoInfo.title);
    console.log('Transcript length:', transcript.length);

    const result: YouTubeVideoInfo = {
      videoId,
      title: videoInfo.title || 'Vídeo do YouTube',
      description: '',
      channelTitle: videoInfo.channelTitle || '',
      thumbnail: videoInfo.thumbnail || '',
      duration: '',
      transcript: transcript || '',
      type: videoInfo.type || 'video',
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-youtube function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar vídeo do YouTube';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
