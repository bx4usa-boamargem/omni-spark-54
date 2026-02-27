import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGlobalKey } from "./getGlobalKey.ts";

type GoogleCustomSearchItem = {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
};

type GoogleCustomSearchResponse = {
  items?: GoogleCustomSearchItem[];
  searchInformation?: { totalResults?: string; searchTime?: number };
  spelling?: { correctedQuery?: string };
};

export async function fetchGoogleCustomSearchRaw(params: {
  supabaseAdmin: SupabaseClient;
  tenant_id: string;
  query: string;
  hl?: string;
  gl?: string;
  timeoutMs?: number;
}): Promise<{ ok: true; data: GoogleCustomSearchResponse } | { ok: false; error: string; status?: number; raw?: unknown }> {
  // Global Platform Mode: ignore per-tenant keys; use Supabase secrets.
  const { apiKey, cx } = getGlobalKey("search");
  if (!cx) return { ok: false, error: "CONFIG_ERROR: GOOGLE_SEARCH_CX não configurada." };

  const expectedCx = "f0905c7b5460c4a70";
  if (cx !== expectedCx) {
    console.warn("[googleSearch] CX diferente do esperado", {
      expected_cx: expectedCx,
      current_cx: cx,
    });
  }

  const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", params.query);
  url.searchParams.set("num", "10");
  if (params.hl) url.searchParams.set("hl", params.hl);
  if (params.gl) url.searchParams.set("gl", params.gl);

  const timeoutMs = params.timeoutMs ?? 12000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), { method: "GET", signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const googleStatus = (json as any)?.error?.status ? String((json as any).error.status) : null;
      const googleMessage = (json as any)?.error?.message ? String((json as any).error.message) : null;
      const reason = (json as any)?.error?.errors?.[0]?.reason ? String((json as any).error.errors[0].reason) : null;

      if (res.status === 403) {
        console.error("[googleSearch] PERMISSION_DENIED (403)", {
          http_status: res.status,
          google_status: googleStatus,
          reason,
          message: googleMessage,
          cx_value: cx,
          query: params.query,
          hl: params.hl,
          gl: params.gl,
        });
      }

      const detail = [googleStatus, reason].filter(Boolean).join(":");
      return {
        ok: false,
        error: `HTTP_${res.status}${detail ? `:${detail}` : ""}`,
        status: res.status,
        raw: json,
      };
    }
    return { ok: true, data: json as GoogleCustomSearchResponse };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function safeDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function normalizeTop10Results(raw: GoogleCustomSearchResponse): Array<{
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
}> {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return items.slice(0, 10).map((it, idx) => {
    const url = String(it.link || "");
    const domain = it.displayLink ? String(it.displayLink).replace(/^www\./, "") : safeDomainFromUrl(url);
    return {
      position: idx + 1,
      title: String(it.title || ""),
      url,
      domain,
      snippet: String(it.snippet || ""),
    };
  });
}

