import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWriter } from "../_shared/aiProviders.ts";
import {
  buildDiagnosticPrompt,
  buildSuggestionsPrompt,
  buildAutonomousRewritePrompt,
  calculatePredictiveMetrics,
  type PerformanceDiagnosis,
  type OptimizationSuggestions,
  type KPIImprovements,
} from '../_shared/performanceOptimizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeRequest {
  title: string;
  content: string;
  metaDescription?: string;
  mode: 'assisted' | 'autonomous';
  companyName?: string;
}

interface AssistedResponse {
  mode: 'assisted';
  diagnosis: PerformanceDiagnosis;
  suggestions: OptimizationSuggestions;
}

interface AutonomousResponse {
  mode: 'autonomous';
  diagnosis: PerformanceDiagnosis;
  optimized_title: string;
  optimized_content: string;
  changes_summary: string[];
  kpi_improvements: KPIImprovements;
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) return fallback;
    return JSON.parse(clean.substring(start, end + 1));
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OptimizeRequest = await req.json();
    const { title, content, metaDescription, mode, companyName } = request;

    if (!title || !content) {
      throw new Error('Title and content are required');
    }

    console.log(`[Performance Optimizer] Mode: ${mode}, Title: ${title.substring(0, 50)}...`);

    // STEP 1: Calculate predictive metrics
    const predictiveMetrics = calculatePredictiveMetrics(content, title);
    console.log('[Performance Optimizer] Predictive metrics:', predictiveMetrics);

    // STEP 2: Run AI diagnosis
    const diagnosticPrompt = buildDiagnosticPrompt(title, content, metaDescription);

    const diagnosisResultRaw = await callWriter({
      messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de performance de conteúdo. Retorne APENAS JSON válido, sem markdown ou explicações.'
          },
          { role: 'user', content: diagnosticPrompt }
        ],
      temperature: 0.3,
      maxTokens: 4096,
    });

    if (!diagnosisResultRaw.success || !diagnosisResultRaw.data?.content) {
      console.error("[AI] Writer failed:", diagnosisResultRaw.fallbackReason);
      throw new Error(`AI error: ${diagnosisResultRaw.fallbackReason}`);
    }

    const rawDiagnosisContent = typeof diagnosisResultRaw.data.content === 'string'
      ? diagnosisResultRaw.data.content
      : JSON.stringify(diagnosisResultRaw.data.content);

    const defaultDiagnosis: PerformanceDiagnosis = {
      score: 50,
      issues: [],
      strengths: [],
    } as unknown as PerformanceDiagnosis;

    const diagnosis: PerformanceDiagnosis = parseJSON<PerformanceDiagnosis>(rawDiagnosisContent, defaultDiagnosis);

    if (mode === 'assisted') {
      // STEP 3a: Generate suggestions
      const suggestionsPrompt = buildSuggestionsPrompt(title, content, diagnosis);

      const suggestionsResultRaw = await callWriter({
        messages: [
            {
              role: 'system',
              content: 'Você é um especialista em otimização de conteúdo SEO. Retorne APENAS JSON válido, sem markdown ou explicações.'
            },
            { role: 'user', content: suggestionsPrompt }
          ],
        temperature: 0.5,
        maxTokens: 4096,
      });

      const rawSuggestionsContent = suggestionsResultRaw.success && suggestionsResultRaw.data?.content
        ? (typeof suggestionsResultRaw.data.content === 'string'
            ? suggestionsResultRaw.data.content
            : JSON.stringify(suggestionsResultRaw.data.content))
        : '{}';

      const suggestions: OptimizationSuggestions = parseJSON<OptimizationSuggestions>(
        rawSuggestionsContent,
        {} as OptimizationSuggestions
      );

      const response: AssistedResponse = {
        mode: 'assisted',
        diagnosis,
        suggestions,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // STEP 3b: Autonomous rewrite
      const rewritePrompt = buildAutonomousRewritePrompt(title, content, diagnosis, companyName);

      const rewriteResultRaw = await callWriter({
        messages: [
            {
              role: 'system',
              content: 'Você é um especialista em otimização de conteúdo. Retorne APENAS JSON válido com o conteúdo reescrito.'
            },
            { role: 'user', content: rewritePrompt }
          ],
        temperature: 0.6,
        maxTokens: 8192,
      });

      const rawRewriteContent = rewriteResultRaw.success && rewriteResultRaw.data?.content
        ? (typeof rewriteResultRaw.data.content === 'string'
            ? rewriteResultRaw.data.content
            : JSON.stringify(rewriteResultRaw.data.content))
        : '{}';

      const rewriteResult = parseJSON<{
        optimized_title?: string;
        optimized_content?: string;
        changes_summary?: string[];
        kpi_improvements?: KPIImprovements;
      }>(rawRewriteContent, {});

      const response: AutonomousResponse = {
        mode: 'autonomous',
        diagnosis,
        optimized_title: rewriteResult.optimized_title || title,
        optimized_content: rewriteResult.optimized_content || content,
        changes_summary: rewriteResult.changes_summary || [],
        kpi_improvements: rewriteResult.kpi_improvements || {
          estimated_read_time_delta: 0,
          predicted_scroll_depth_delta: 0,
          predicted_bounce_rate_delta: 0,
        } as unknown as KPIImprovements,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[Performance Optimizer] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
