export function getGlobalKey(
  provider: "gemini" | "search" | "maps" | "places" = "gemini",
) {
  // PRIORIDADE ABSOLUTA:
  // Secrets Globais do Supabase
  const globalKey = Deno.env.get("GOOGLE_GLOBAL_API_KEY");
  const globalCX = Deno.env.get("GOOGLE_SEARCH_CX");

  if (!globalKey) {
    throw new Error(
      `CONFIG_ERROR: GOOGLE_GLOBAL_API_KEY não configurada no Supabase Secrets (necessário para o Radar V3).`,
    );
  }

  if (provider === "search" && !globalCX) {
    console.error(
      "CONFIG_WARNING: GOOGLE_SEARCH_CX ausente.",
    );
  }

  return {
    apiKey: globalKey,
    cx: globalCX,
  };
}

