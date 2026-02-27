export type ApiProvider =
  | "google_native"
  | "google_native_search"
  | "google_native_places"
  | "google_native_maps";

export interface ApiUsageEvent {
  tenant_id?: string | null;
  blog_id?: string | null;
  user_id?: string | null;
  article_id?: string | null;
  api_provider: ApiProvider | string;
  api_name: string;
  tokens_input?: number | null;
  tokens_output?: number | null;
  estimated_cost_usd?: number | null;
  execution_time_ms?: number | null;
  timestamp?: string;
  action_type?: string;
  action_description?: string | null;
  model_used?: string | null;
  metadata?: Record<string, unknown> | null;
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
    insert: (payload: any) => any;
  };
};

async function resolveUserId(
  supabase: SupabaseLike,
  input: { user_id?: string | null; blog_id?: string | null },
): Promise<string | null> {
  if (input.user_id) return input.user_id;
  if (!input.blog_id) return null;
  try {
    const { data } = await supabase.from("blogs").select("user_id").eq("id", input.blog_id).maybeSingle();
    return (data?.user_id && typeof data.user_id === "string") ? data.user_id : null;
  } catch {
    return null;
  }
}

export async function trackApiUsageSafe(supabase: SupabaseLike, event: ApiUsageEvent): Promise<void> {
  try {
    if (!supabase || typeof supabase.from !== "function") return;
    if (!event?.api_name) return;

    const user_id = await resolveUserId(supabase, { user_id: event.user_id || null, blog_id: event.blog_id || null });
    if (!user_id) return;

    const payload: Record<string, unknown> = {
      user_id,
      blog_id: event.blog_id || null,
      action_type: event.action_type || "api_usage",
      action_description: event.action_description ?? null,
      model_used: event.model_used || `${event.api_provider}:${event.api_name}`,
      input_tokens: typeof event.tokens_input === "number" ? event.tokens_input : null,
      output_tokens: typeof event.tokens_output === "number" ? event.tokens_output : null,
      images_generated: null,
      estimated_cost_usd: typeof event.estimated_cost_usd === "number" ? event.estimated_cost_usd : 0,
      metadata: {
        tenant_id: event.tenant_id || null,
        article_id: event.article_id || null,
        api_provider: event.api_provider,
        api_name: event.api_name,
        execution_time_ms: typeof event.execution_time_ms === "number" ? event.execution_time_ms : null,
        timestamp: event.timestamp || null,
        ...(event.metadata || {}),
      },
    };
    if (event.timestamp) payload.created_at = event.timestamp;

    await supabase.from("consumption_logs").insert(payload);
  } catch {
    // never throw
  }
}

