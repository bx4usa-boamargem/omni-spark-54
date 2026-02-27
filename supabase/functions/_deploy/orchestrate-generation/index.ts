import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OutlineData = { h2: Array<{ title: string; points?: string[] }> };

interface AIRouterResult {
  success: boolean;
  content: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  error?: string;
}

async function callAIRouter(params: {
  supabaseUrl: string;
  serviceKey: string;
  task: string;
  messages: Array<{ role: string; content: string }>;
  tenant_id: string;
  blog_id: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<AIRouterResult> {
  const url = `${params.supabaseUrl}/functions/v1/ai-router`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      task: params.task,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      tenant_id: params.tenant_id,
      blog_id: params.blog_id,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      success: false,
      content: "",
      model: "",
      provider: "gemini",
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      latencyMs: 0,
      error: (data as any)?.error || `HTTP_${resp.status}`,
    };
  }
  return data as AIRouterResult;
}

function parseAIJson(content: string): any {
  try {
    return JSON.parse(content);
  } catch {}
  const code = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (code) {
    try {
      return JSON.parse(code[1].trim());
    } catch {}
  }
  const json = content.match(/\{[\s\S]*\}/);
  if (json) {
    try {
      return JSON.parse(json[0]);
    } catch {}
  }
  throw new Error("PARSE_ERROR");
}

function executeInputValidation(jobInput: Record<string, unknown>) {
  const errors: string[] = [];
  if (!jobInput?.keyword || String(jobInput.keyword).trim().length < 2) errors.push("keyword obrigatório");
  if (!jobInput?.niche || String(jobInput.niche).trim().length < 2) errors.push("niche obrigatório");
  if (!jobInput?.blog_id || String(jobInput.blog_id).trim().length < 8) errors.push("blog_id obrigatório");
  if (errors.length) throw new Error(`Input validation failed: ${errors.join("; ")}`);
  return { validated: true };
}

async function createStepOrFail(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  stepName: string,
  input: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("generation_steps")
    .insert({ job_id: jobId, step_name: stepName, status: "running", started_at: new Date().toISOString(), input })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) throw new Error(`STEP_INSERT_FAILED:${stepName}`);
  return data.id as string;
}

async function failJob(supabase: ReturnType<typeof createClient>, jobId: string, message: string) {
  await supabase
    .from("generation_steps")
    .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .eq("status", "running");
  await supabase
    .from("generation_jobs")
    .update({ status: "failed", error_message: message, completed_at: new Date().toISOString(), locked_at: null, locked_by: null })
    .eq("id", jobId);
}

async function orchestrate(jobId: string, supabase: ReturnType<typeof createClient>, supabaseUrl: string, serviceKey: string) {
  const { data: job } = await supabase.from("generation_jobs").select("*").eq("id", jobId).single();
  if (!job) return;

  const tenantId = String((job as any).tenant_id || "");
  const blogId = String((job as any).blog_id || "");
  if (!tenantId || !blogId) throw new Error("JOB_MISSING_TENANT_OR_BLOG");

  const jobType = (((job as any).job_type ?? (job as any).input?.job_type) || "super_page") as "article" | "super_page";
  const jobInput = { ...(((job as any).input as any) || {}), job_type: jobType, blog_id: blogId };

  await supabase.from("generation_jobs").update({ status: "running", started_at: (job as any).started_at || new Date().toISOString() }).eq("id", jobId);
  const lockId = crypto.randomUUID();
  await supabase.from("generation_jobs").update({ locked_at: new Date().toISOString(), locked_by: lockId }).eq("id", jobId);

  try {
    const valStepId = await createStepOrFail(supabase, jobId, "INPUT_VALIDATION", { input: jobInput });
    const valOut = executeInputValidation(jobInput);
    await supabase.from("generation_steps").update({ status: "completed", output: valOut, completed_at: new Date().toISOString() }).eq("id", valStepId);

    const serpStepId = await createStepOrFail(supabase, jobId, "SERP_ANALYSIS", { keyword: jobInput.keyword });
    const serpAi = await callAIRouter({
      supabaseUrl,
      serviceKey,
      tenant_id: tenantId,
      blog_id: blogId,
      task: "serp_analysis",
      messages: [
        { role: "system", content: "Você é um analista de SERP. Responda JSON." },
        { role: "user", content: `Keyword: ${String(jobInput.keyword)}\nCity: ${String(jobInput.city || "")}\nRetorne JSON {summary:string}` },
      ],
    });
    if (!serpAi.success) throw new Error(`SERP_ANALYSIS_FAILED:${serpAi.error || "unknown"}`);
    const serpParsed = parseAIJson(serpAi.content);
    const serpSummaryText = String(serpParsed.summary || serpAi.content);
    await supabase.from("generation_steps").update({ status: "completed", output: { summary: serpSummaryText }, completed_at: new Date().toISOString(), model_used: serpAi.model, provider: serpAi.provider }).eq("id", serpStepId);

    const outlineStepId = await createStepOrFail(supabase, jobId, "OUTLINE_GEN", { keyword: jobInput.keyword });
    const outlineAi = await callAIRouter({
      supabaseUrl,
      serviceKey,
      tenant_id: tenantId,
      blog_id: blogId,
      task: "outline_gen",
      messages: [
        { role: "system", content: "Você cria outline. Responda JSON." },
        { role: "user", content: `Keyword: ${String(jobInput.keyword)}\nSERP: ${serpSummaryText}\nRetorne JSON {h2:[{title:string,points:string[]}]}` },
      ],
      maxTokens: 8000,
    });
    if (!outlineAi.success) throw new Error(`OUTLINE_FAILED:${outlineAi.error || "unknown"}`);
    const outlineParsed = parseAIJson(outlineAi.content);
    const outline: OutlineData = { h2: Array.isArray(outlineParsed.h2) ? outlineParsed.h2.map((x: any) => ({ title: String(x.title || ""), points: Array.isArray(x.points) ? x.points.map(String) : [] })) : [] };
    await supabase.from("generation_steps").update({ status: "completed", output: { outline }, completed_at: new Date().toISOString(), model_used: outlineAi.model, provider: outlineAi.provider }).eq("id", outlineStepId);

    const genStepId = await createStepOrFail(supabase, jobId, "CONTENT_GEN", { keyword: jobInput.keyword });
    const genAi = await callAIRouter({
      supabaseUrl,
      serviceKey,
      tenant_id: tenantId,
      blog_id: blogId,
      task: "article_gen_from_outline",
      messages: [
        { role: "system", content: "Escreva HTML completo e retorne JSON." },
        { role: "user", content: `Keyword: ${String(jobInput.keyword)}\nCity: ${String(jobInput.city || "")}\nNiche: ${String(jobInput.niche || "default")}\nType: ${jobType}\nOutline: ${JSON.stringify(outline)}\nRetorne JSON {title:string, meta_description:string, html_article:string, faq:[{q:string,a:string}], image_prompt:string}` },
      ],
      maxTokens: 12000,
    });
    if (!genAi.success) throw new Error(`CONTENT_FAILED:${genAi.error || "unknown"}`);
    const articleData = parseAIJson(genAi.content);
    await supabase.from("generation_steps").update({ status: "completed", output: { title: articleData.title }, completed_at: new Date().toISOString(), model_used: genAi.model, provider: genAi.provider }).eq("id", genStepId);

    await supabase.from("generation_jobs").update({ status: "completed", completed_at: new Date().toISOString(), locked_at: null, locked_by: null }).eq("id", jobId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ENGINE_ERROR";
    await failJob(supabase, jobId, msg);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await orchestrate(String(job_id), supabase, supabaseUrl, serviceKey);
    return new Response(JSON.stringify({ success: true, job_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

