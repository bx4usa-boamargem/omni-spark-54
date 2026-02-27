import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGlobalKey } from "./getGlobalKey.ts";

export type IntegrationProvider = "gemini" | "maps" | "search";

export type IntegrationKeyResult = {
  api_key: string;
  extra_config: Record<string, unknown> | null;
};

export function getAdminSupabaseClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function getIntegrationKey(input: {
  supabaseAdmin: SupabaseClient;
  tenant_id: string;
  provider: IntegrationProvider;
}): Promise<IntegrationKeyResult> {
  // Global Platform Mode (FINAL): ignore per-tenant storage for Google keys.
  // This function is kept for backward compatibility with legacy call sites.
  if (input.provider === "gemini") {
    const { apiKey } = getGlobalKey("gemini");
    return { api_key: apiKey, extra_config: null };
  }
  if (input.provider === "maps") {
    const { apiKey } = getGlobalKey("maps");
    return { api_key: apiKey, extra_config: null };
  }
  if (input.provider === "search") {
    const { apiKey, cx } = getGlobalKey("search");
    return { api_key: apiKey, extra_config: cx ? { cx } : null };
  }

  const { data, error } = await input.supabaseAdmin
    .from("api_integrations")
    .select("api_key, extra_config")
    .eq("tenant_id", input.tenant_id)
    .eq("provider", input.provider)
    .maybeSingle();

  if (error) throw new Error(`INTEGRATION_LOOKUP_FAILED:${input.provider}:${error.message}`);
  if (!data?.api_key) throw new Error(`INTEGRATION_NOT_CONFIGURED:${input.provider}`);

  const extra =
    (data as any)?.extra_config && typeof (data as any).extra_config === "object"
      ? ((data as any).extra_config as Record<string, unknown>)
      : null;

  return { api_key: String((data as any).api_key), extra_config: extra };
}

