/**
 * Configuração de AIs - OmniSeen
 * Stack: OpenAI + Google Gemini + Perplexity + Google Imagen 3 + Unsplash
 *
 * REGRA ABSOLUTA: Este é o arquivo de configuração oficial.
 * Todos os modelos, endpoints e chaves são definidos aqui.
 * Nenhuma dependência de gateways de terceiros (ex: Lovable).
 */

import { getGeminiModel } from "./getGeminiModel.ts";

export const AI_CONFIG = {
  writer: {
    primary: {
      provider: 'openai' as const,
      model: 'gpt-4o-2024-11-20',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      temperature: 0.4,
      maxTokens: 8000,
      responseFormat: { type: 'json_object' }
    },
    fallback: {
      provider: 'google' as const,
      model: getGeminiModel(),
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      temperature: 0.4,
      maxOutputTokens: 8192
    }
  },

  research: {
    primary: {
      provider: 'google' as const,
      model: getGeminiModel(),
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      useGrounding: true,
      groundingSource: 'google_search'
    },
    fallback: {
      provider: 'perplexity' as const,
      model: 'sonar-pro',
      endpoint: 'https://api.perplexity.ai/chat/completions',
      searchMode: 'web',
      citations: true
    }
  },

  qa: {
    primary: {
      provider: 'google' as const,
      model: getGeminiModel(),
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      temperature: 0.1,
      responseFormat: 'json'
    },
    fallback: {
      provider: 'openai' as const,
      model: 'gpt-4o-2024-11-20',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      temperature: 0.1,
      responseFormat: { type: 'json_object' }
    }
  },

  images: {
    primary: {
      provider: 'google-imagen' as const,
      model: 'imagen-3.0-generate-002',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      aspectRatio: '16:9'
    },
    fallback: {
      provider: 'google-places' as const,
      apiUrl: 'https://maps.googleapis.com/maps/api/place',
      size: '1024x576',
      quality: 80
    }
  }
};

export const SUPPORTED_PROVIDERS = ['openai', 'google', 'perplexity', 'google-imagen', 'unsplash', 'google-places', 'none'] as const;

export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export type AIFunction = 'writer' | 'research' | 'qa' | 'images';

export interface AICallResult<T> {
  success: boolean;
  data?: T;
  provider: SupportedProvider;
  usedFallback: boolean;
  fallbackReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  durationMs: number;
}

// Utility: Get API key for a provider
export function getProviderApiKey(provider: SupportedProvider): string | undefined {
  switch (provider) {
    case 'openai':
      return Deno.env.get('OPENAI_API_KEY');
    case 'perplexity':
      return Deno.env.get('PERPLEXITY_API_KEY');
    case 'google':
    case 'google-imagen':
      return Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    case 'unsplash':
      return 'none'; // público
    case 'google-places':
      return Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY');
    case 'none':
      return undefined;
    default:
      return undefined;
  }
}

// Check if all required API keys are configured
export function validateAPIKeys(): { valid: boolean; missing: string[] } {
  // Google is configured per-tenant via api_integrations (not via env)
  const required: SupportedProvider[] = ['openai', 'perplexity'];
  const missing: string[] = [];

  for (const provider of required) {
    const key = getProviderApiKey(provider);
    if (!key) {
      missing.push(provider);
    }
  }

  return { valid: missing.length === 0, missing };
}

// Log helper for AI calls
export function logAICall(
  fn: AIFunction,
  provider: SupportedProvider,
  success: boolean,
  durationMs: number,
  fallback: boolean = false,
  error?: string
): void {
  const status = success ? '✅' : '❌';
  const fallbackTag = fallback ? ' (FALLBACK)' : '';
  const errorMsg = error ? ` - ${error}` : '';
  console.log(`[AI_CONFIG] ${fn}: ${status} ${provider}${fallbackTag} in ${durationMs}ms${errorMsg}`);
}
