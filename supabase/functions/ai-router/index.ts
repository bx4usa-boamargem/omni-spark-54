import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminSupabaseClient } from "../_shared/getIntegrationKey.ts";
import { fetchGoogleCustomSearchRaw, normalizeTop10Results } from "../_shared/googleSearch.ts";
import { getGlobalKey } from "../_shared/getGlobalKey.ts";
import { getGeminiModel } from "../_shared/getGeminiModel.ts";

/**
 * AI Router — OmniSeen Article Engine v1
 * 
 * Camada única para chamadas DIRETAS ao Gemini (Google Generative Language API).
 * - Sem gateways/provedores intermediários
 * - Chave via `GOOGLE_GLOBAL_API_KEY` (getGlobalKey)
 * - Modelo via secret `GEMINI_MODEL` (getGeminiModel)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface Locale {
  country: string;
  city?: string;
  state?: string;
  language: string;
}

export interface AICallParams {
  task: TaskType;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  tools?: unknown[];
  toolChoice?: unknown;
  apiKey: string;
  responseMimeType?: "application/json" | "text/plain";
}

export interface AICallResult {
  success: boolean;
  content: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  error?: string;
  rawResponse?: unknown;
}

type TaskType =
  | 'serp_analysis'
  | 'nlp_keywords'
  | 'title_gen'
  | 'outline_gen'
  | 'content_gen'
  | 'content_critic'
  | 'context_summary'
  | 'image_gen'
  | 'seo_score'
  | 'meta_gen'
  | 'serp_summary'
  | 'article_gen_single_pass'
  | 'entity_extraction'
  | 'article_gen_from_outline'
  | 'serp_gap_analysis'
  | 'section_expansion'
  | 'entity_coverage_assign';

// ============================================================
// ROUTING TABLE (temperature/maxTokens por task)
// ============================================================

const MODEL_ROUTING: Record<TaskType, { temperature: number; maxTokens: number }> = {
  serp_analysis: { temperature: 0.3, maxTokens: 8000 },
  nlp_keywords: { temperature: 0.2, maxTokens: 8000 },
  title_gen: { temperature: 0.7, maxTokens: 4000 },
  outline_gen: { temperature: 0.4, maxTokens: 8000 },
  content_gen: { temperature: 0.5, maxTokens: 12000 },
  content_critic: { temperature: 0.1, maxTokens: 4000 },
  context_summary: { temperature: 0.1, maxTokens: 2000 },
  image_gen: { temperature: 0.7, maxTokens: 2000 },
  seo_score: { temperature: 0.1, maxTokens: 4000 },
  meta_gen: { temperature: 0.3, maxTokens: 4000 },
  serp_summary: { temperature: 0.3, maxTokens: 2000 },
  article_gen_single_pass: { temperature: 0.4, maxTokens: 8000 },
  entity_extraction: { temperature: 0.2, maxTokens: 4000 },
  article_gen_from_outline: { temperature: 0.4, maxTokens: 12000 },
  serp_gap_analysis: { temperature: 0.2, maxTokens: 4000 },
  section_expansion: { temperature: 0.3, maxTokens: 4000 },
  entity_coverage_assign: { temperature: 0.2, maxTokens: 4000 },
};

// Cost per 1M tokens (placeholder; optional)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.0, output: 0.0 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const costs = COST_TABLE[model] || { input: 1.0, output: 5.0 };
  return (tokensIn / 1_000_000) * costs.input + (tokensOut / 1_000_000) * costs.output;
}

// ============================================================
// CORE: Call Gemini API (direct API key)
// ============================================================

function toGeminiRole(role: string): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function splitSystemAndContents(messages: Array<{ role: string; content: string }>): { systemText: string; contents: any[] } {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => String(m.content || ""))
    .filter(Boolean)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: String(m.content || "") }],
    }));
  return { systemText, contents };
}

async function callGeminiApiKey(params: AICallParams): Promise<AICallResult> {
  const routing = MODEL_ROUTING[params.task];
  const model = getGeminiModel();
  const temperature = params.temperature ?? routing.temperature;
  const maxTokens = params.maxTokens ?? routing.maxTokens;

  const { systemText, contents } = splitSystemAndContents(params.messages);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const startMs = Date.now();

  try {
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
      },
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startMs;
    const data = await response.json().catch(() => ({} as any));

    if (!response.ok) {
      const errText = JSON.stringify(data).slice(0, 400);
      if (response.status === 429) {
        return { success: false, content: "", model, provider: "gemini", tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs, error: `RATE_LIMITED:${response.status}:${errText}` };
      }
      return { success: false, content: "", model, provider: "gemini", tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs, error: `HTTP_${response.status}:${errText}` };
    }

    const text = (data as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    const tokensIn = Number((data as any)?.usageMetadata?.promptTokenCount || 0);
    const tokensOut = Number((data as any)?.usageMetadata?.candidatesTokenCount || 0);
    const costUsd = estimateCost(model, tokensIn, tokensOut);

    if (!text || !String(text).trim().length) {
      return { success: false, content: "", model, provider: "gemini", tokensIn, tokensOut, costUsd, latencyMs, error: "EMPTY_MODEL_OUTPUT", rawResponse: data };
    }

    return { success: true, content: String(text), model, provider: "gemini", tokensIn, tokensOut, costUsd, latencyMs, rawResponse: data };
  } catch (error) {
    const latencyMs = Date.now() - startMs;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, content: "", model, provider: "gemini", tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs, error: errorMsg };
  }
}

// ============================================================
// RETRY LOGIC with exponential backoff
// ============================================================

async function callWithRetry(params: AICallParams, maxRetries = 3): Promise<AICallResult> {
  const delays = [1000, 4000, 16000]; // 1s, 4s, 16s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await callGeminiApiKey(params);

    if (result.success) return result;

    // Don't retry payment errors
    if (result.error?.startsWith('PAYMENT_REQUIRED')) return result;

    // Retry on rate limit or transient errors
    if (attempt < maxRetries) {
      const delay = delays[attempt] || 16000;
      console.log(`[AI_ROUTER] Retry ${attempt + 1}/${maxRetries} for ${params.task} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Should not reach here, but safety net
  return callGeminiApiKey(params);
}

// ============================================================
// HTTP Handler
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { task, messages, temperature, maxTokens, tools, toolChoice, tenant_id, blog_id } = body;

    if (!task || !messages) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: task, messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!MODEL_ROUTING[task as TaskType]) {
      return new Response(
        JSON.stringify({ error: `Unknown task: ${task}. Valid: ${Object.keys(MODEL_ROUTING).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = getAdminSupabaseClient();
    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Global Platform Mode: ignore tenant/blog key resolution.
    const gemini = getGlobalKey("gemini");

    // If SERP-related task: enrich context with Google Custom Search results (requires search integration)
    let effectiveMessages = Array.isArray(messages) ? messages : [];
    if (String(task).startsWith("serp_")) {
      const lastUser = [...effectiveMessages].reverse().find((m: any) => m?.role === "user")?.content || "";
      const quoted = typeof lastUser === "string" ? lastUser.match(/keyword\s+\"([^\"]+)\"/i) : null;
      const q = quoted?.[1] ? `${quoted[1]}` : String(lastUser).slice(0, 160);

      const raw = await fetchGoogleCustomSearchRaw({
        supabaseAdmin: supabaseAdmin as any,
        tenant_id: (typeof tenant_id === "string" ? tenant_id : "global"),
        query: q,
        hl: "en",
        gl: "us",
      });
      if (!raw.ok) {
        console.error("[AI_ROUTER] Google Search failed; continuing without SERP evidence", {
          task,
          query: q,
          status: raw.status ?? null,
          error: raw.error ?? null,
        });
        effectiveMessages = [
          ...effectiveMessages.slice(0, 1),
          {
            role: "system",
            content:
              "SERP evidence is temporarily unavailable (Google Custom Search failed). Continue without citing specific URLs. Do not fabricate external sources.",
          },
          ...effectiveMessages.slice(1),
        ];
      } else {
        const top10 = normalizeTop10Results(raw.data);
        const serpCtx = [
          `Google Custom Search (top ${top10.length}) for query=\"${q}\":`,
          ...top10.map((r) => `#${r.position} ${r.title}\n${r.url}\n${r.snippet}`),
        ].join("\n\n");

        effectiveMessages = [
          ...effectiveMessages.slice(0, 1),
          { role: "system", content: `Use ONLY the following SERP evidence for analysis (do not invent):\n\n${serpCtx}` },
          ...effectiveMessages.slice(1),
        ];
      }
    }

    const wantsJson =
      (typeof body?.responseFormat === "string" && body.responseFormat === "json") ||
      ["serp_analysis", "outline_gen"].includes(String(task)) ||
      effectiveMessages.some((m: any) => typeof m?.content === "string" && /ONLY valid JSON|Return ONLY valid JSON|JSON \(/i.test(m.content));

    const result = await callWithRetry({
      task: task as TaskType,
      messages: effectiveMessages,
      temperature,
      maxTokens,
      tools,
      toolChoice,
      apiKey: gemini.apiKey,
      responseMimeType: wantsJson ? "application/json" : undefined,
    });

    const status = result.success ? 200 : (result.error?.includes('RATE_LIMITED') ? 429 : result.error?.includes('PAYMENT_REQUIRED') ? 402 : 500);

    return new Response(
      JSON.stringify(result),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI_ROUTER] Fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
