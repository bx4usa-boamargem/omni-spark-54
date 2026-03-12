/**
 * AIOS Client — Bridge para o AIOS Colonel Kernel
 *
 * Este é o único ponto de entrada para chamar agentes AIOS.
 * O kernel Python roda em Railway/Render e expõe uma API REST.
 *
 * Fallback: se o kernel estiver offline, chama Claude diretamente.
 */

// ============================================================================
// CONFIG
// ============================================================================

const AIOS_KERNEL_URL = Deno.env.get('AIOS_KERNEL_URL') || 'http://localhost:8000';
const AIOS_KERNEL_SECRET = Deno.env.get('AIOS_KERNEL_SECRET') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const AGENT_TIMEOUT_MS = 30_000;

// ============================================================================
// TYPES
// ============================================================================

export type AIOSAgentName =
  | 'AuditAgent'
  | 'ResponseAgent'
  | 'QualificationAgent'
  | 'OutreachAgent'
  | 'AnalyticsAgent';

export interface AIOSRequest {
  agent: AIOSAgentName;
  payload: Record<string, unknown>;
  tenantId?: string;
  locationId?: string; // GHL location ID
}

export interface AIOSResponse {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  agentUsed: AIOSAgentName;
  usedFallback: boolean;
  durationMs: number;
}

// AuditAgent specific
export interface AuditPayload {
  place_id?: string;
  business_name?: string;
  niche?: string;
  city?: string;
  language?: string;
}

export interface AuditResult {
  score: number; // 0-100
  business_name: string;
  falhas: Array<{ categoria: string; descricao: string; impacto: string }>;
  leads_perdidos_semana: number;
  receita_perdida_mes: number;
  recomendacao: string;
  urgencia: 'alta' | 'media' | 'baixa';
}

// ResponseAgent specific
export interface ResponsePayload {
  conversation_id: string;
  contact_name: string;
  message: string;
  channel: string;
  history: Array<{ role: string; content: string }>;
  persona?: string;
  knowledge_base?: string;
}

export interface ResponseResult {
  reply: string;
  confidence: number;
  action?: 'book_appointment' | 'transfer_human' | 'follow_up' | 'close';
  reasoning: string;
}

// QualificationAgent specific
export interface QualificationPayload {
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  source: string;
  niche?: string;
  message?: string;
}

export interface QualificationResult {
  score: number; // 0-100
  tier: 'hot' | 'warm' | 'cold';
  recommended_action: string;
  tags: string[];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Chama um agente AIOS Colonel via HTTP.
 * Fallback automático para Claude se kernel estiver offline.
 */
export async function callAIOSAgent(request: AIOSRequest): Promise<AIOSResponse> {
  const start = Date.now();

  // Tenta o kernel Python primeiro
  try {
    const result = await callKernel(request);
    return {
      success: true,
      result,
      agentUsed: request.agent,
      usedFallback: false,
      durationMs: Date.now() - start,
    };
  } catch (kernelError) {
    const errMsg = kernelError instanceof Error ? kernelError.message : 'Unknown';
    console.warn(`[AIOS] Kernel failed for ${request.agent}: ${errMsg}. Using Claude fallback.`);

    // Fallback para Claude direto
    try {
      const result = await callClaudeFallback(request);
      return {
        success: true,
        result,
        agentUsed: request.agent,
        usedFallback: true,
        durationMs: Date.now() - start,
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: `Kernel: ${errMsg} | Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`,
        agentUsed: request.agent,
        usedFallback: true,
        durationMs: Date.now() - start,
      };
    }
  }
}

// ============================================================================
// KERNEL CALLER
// ============================================================================

async function callKernel(request: AIOSRequest): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const response = await fetch(`${AIOS_KERNEL_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIOS_KERNEL_SECRET}`,
        'X-Tenant-Id': request.tenantId || '',
        'X-Location-Id': request.locationId || '',
      },
      body: JSON.stringify({
        agent: request.agent,
        payload: request.payload,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`AIOS Kernel HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// CLAUDE FALLBACK
// ============================================================================

async function callClaudeFallback(request: AIOSRequest): Promise<Record<string, unknown>> {
  if (!OPENAI_API_KEY) {
    throw new Error('No fallback AI key configured');
  }

  const systemPrompt = buildFallbackPrompt(request.agent);
  const userContent = JSON.stringify(request.payload, null, 2);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`OpenAI fallback error ${response.status}: ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

function buildFallbackPrompt(agent: AIOSAgentName): string {
  const prompts: Record<AIOSAgentName, string> = {
    AuditAgent: `You are a Google Business Profile audit specialist. Analyze the business data and return a JSON audit report with: score (0-100), falhas (array of issues with categoria/descricao/impacto), leads_perdidos_semana (int), receita_perdida_mes (int in USD), recomendacao (string), urgencia (alta/media/baixa). Be specific and actionable.`,

    ResponseAgent: `You are an AI sales representative. Analyze the conversation and return JSON with: reply (your response to the customer), confidence (0-1), action (book_appointment|transfer_human|follow_up|close), reasoning (why this action). Keep replies concise and conversion-focused.`,

    QualificationAgent: `You are a lead qualification specialist. Score the lead and return JSON with: score (0-100), tier (hot|warm|cold), recommended_action (string), tags (array of strings). Consider urgency, budget signals, and fit.`,

    OutreachAgent: `You are a cold outreach copywriter. Write a personalized outreach email based on the audit findings. Return JSON with: subject (string), body (string), cta (string). Keep it under 150 words, highly personalized.`,

    AnalyticsAgent: `You are a business analytics specialist. Analyze the metrics and return JSON with: insights (array), recommendations (array), priority_actions (array of 3 max). Be specific with numbers.`,
  };

  return prompts[agent];
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Verifica se o AIOS Kernel está online.
 * Use para decidir entre kernel real vs. fallback.
 */
export async function checkAIOSHealth(): Promise<{ online: boolean; latencyMs?: number }> {
  const start = Date.now();
  try {
    const response = await fetch(`${AIOS_KERNEL_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return {
      online: response.ok,
      latencyMs: Date.now() - start,
    };
  } catch {
    return { online: false };
  }
}
