// ============================================================
// OmniSeen AI Engine — AI Router
// Gemini 2.5 Flash / Pro with token tracking + kill-switch
// Compatible: Deno / Supabase Edge Runtime
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Pricing per 1M tokens (USD) — Gemini 2.5
const MODEL_CONFIG = {
  flash: {
    model: "gemini-2.5-flash-preview-05-20",
    cost_per_1m_input:  0.075,
    cost_per_1m_output: 0.30,
    max_tokens: 8192,
  },
  pro: {
    model: "gemini-2.5-pro-preview-05-06",
    cost_per_1m_input:  1.25,
    cost_per_1m_output: 5.00,
    max_tokens: 8192,
  },
} as const;

export type GeminiModel = keyof typeof MODEL_CONFIG;

export interface AICallOptions {
  maxTokens?: number;
  temperature?: number;
  responseSchema?: Record<string, unknown>; // forces JSON output
  systemPrompt?: string;
}

export interface AICallResult {
  output: string;
  parsed?: unknown; // if responseSchema provided
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  model: string;
}

function estimateCost(model: GeminiModel, tokens_in: number, tokens_out: number): number {
  const cfg = MODEL_CONFIG[model];
  return (tokens_in / 1_000_000) * cfg.cost_per_1m_input
       + (tokens_out / 1_000_000) * cfg.cost_per_1m_output;
}

export async function callGemini(
  model: GeminiModel,
  prompt: string,
  options: AICallOptions = {}
): Promise<AICallResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const cfg = MODEL_CONFIG[model];
  const maxTokens = options.maxTokens ?? cfg.max_tokens;

  const requestBody: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: options.temperature ?? 0.7,
    },
  };

  if (options.systemPrompt) {
    (requestBody as Record<string, unknown>).systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  if (options.responseSchema) {
    (requestBody.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
    (requestBody.generationConfig as Record<string, unknown>).responseSchema = options.responseSchema;
  }

  const url = `${GEMINI_API_BASE}/${cfg.model}:generateContent?key=${apiKey}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${err}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      if (!candidate) throw new Error("No candidates in Gemini response");

      const text = candidate.content?.parts?.[0]?.text ?? "";
      const usage = data.usageMetadata ?? {};
      const tokens_in  = usage.promptTokenCount     ?? Math.ceil(prompt.length / 4);
      const tokens_out = usage.candidatesTokenCount ?? Math.ceil(text.length / 4);
      const cost_usd   = estimateCost(model, tokens_in, tokens_out);

      let parsed: unknown = undefined;
      if (options.responseSchema) {
        try {
          parsed = JSON.parse(text);
        } catch {
          // return raw if parse fails
        }
      }

      return { output: text, parsed, tokens_in, tokens_out, cost_usd, model: cfg.model };

    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("callGemini: max retries exceeded");
}

// ---- Cost tracking wrapper ----
export async function callGeminiTracked(
  model: GeminiModel,
  prompt: string,
  options: AICallOptions & {
    tenant_id: string;
    agent_id: string;
    supabase_url?: string;
    supabase_service_key?: string;
  }
): Promise<AICallResult> {
  const { tenant_id, agent_id, supabase_url, supabase_service_key, ...aiOptions } = options;

  // Check kill-switch before calling
  const sbUrl = supabase_url ?? Deno.env.get("SUPABASE_URL")!;
  const sbKey = supabase_service_key ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(sbUrl, sbKey);

  const { data: limits } = await sb
    .from("ai_cost_limits")
    .select("kill_switch_active")
    .eq("tenant_id", tenant_id)
    .single();

  if (limits?.kill_switch_active) {
    throw new Error(`AI quota exceeded for tenant ${tenant_id}. Kill-switch active.`);
  }

  const result = await callGemini(model, prompt, aiOptions);

  // Log usage and update counters
  await Promise.all([
    sb.from("ai_usage_logs").insert({
      tenant_id,
      agent_id,
      model: result.model,
      tokens_in: result.tokens_in,
      tokens_out: result.tokens_out,
      cost_usd: result.cost_usd,
      created_at: new Date().toISOString(),
    }),
    sb.rpc("increment_ai_usage", {
      p_tenant_id:  tenant_id,
      p_tokens_in:  result.tokens_in,
      p_tokens_out: result.tokens_out,
      p_cost_usd:   result.cost_usd,
    }),
  ]);

  return result;
}
