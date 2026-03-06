import { AIRouterResult, AIRouterOptions } from "../types/agentTypes.ts";

export class ParseError extends Error {
    rawContent: string;
    constructor(message: string, rawContent: string) {
        super(message);
        this.name = 'ParseError';
        this.rawContent = rawContent;
    }
}

export function parseAIJson(content: string, label: string): Record<string, unknown> {
    const clean = content.replace(/```json\s*|```\s*/g, '').trim();
    try { return JSON.parse(clean); } catch { /* continue */ }

    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]); } catch { /* continue */ }
    }

    const startIdx = content.indexOf('{');
    const endIdx = content.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try { return JSON.parse(content.substring(startIdx, endIdx + 1)); } catch { /* continue */ }
    }

    throw new ParseError(`${label}_PARSE_ERROR: Could not extract valid JSON`, content);
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`STEP_TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
        ),
    ]);
}

export async function callAIRouter(
    supabaseUrl: string,
    serviceKey: string,
    task: string,
    messages: Array<{ role: string; content: string }>,
    options?: AIRouterOptions
): Promise<AIRouterResult> {
    const url = `${supabaseUrl}/functions/v1/ai-router`;
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            task,
            messages,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            tenant_id: options?.tracking?.tenant_id ?? null,
            blog_id: options?.tracking?.blog_id ?? null,
            archetype: options?.archetype,
            variation_seed: options?.variation_seed,
        }),
    });

    const data = await resp.json();
    if (!resp.ok) {
        return {
            success: false, content: '', model: '', provider: 'lovable-gateway',
            tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs: 0,
            error: data.error || `HTTP_${resp.status}`,
        };
    }
    return data as AIRouterResult;
}
