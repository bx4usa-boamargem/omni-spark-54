export function getGlobalKey(
  provider: "gemini" | "search" | "maps" | "places" = "gemini",
) {
  // PRIORIDADE: GOOGLE_GLOBAL_API_KEY > GOOGLE_API_KEY > GEMINI_API_KEY
  const globalKey =
    Deno.env.get("GOOGLE_GLOBAL_API_KEY") ||
    Deno.env.get("GOOGLE_API_KEY") ||
    Deno.env.get("GEMINI_API_KEY");

  // Search Engine CX — necessário apenas para provider "search"
  const globalCX =
    Deno.env.get("GOOGLE_SEARCH_CX") ||
    Deno.env.get("GOOGLE_CUSTOM_SEARCH_CX");

  if (!globalKey) {
    throw new Error(
      `CONFIG_ERROR: Nenhuma chave Google encontrada. Configure GOOGLE_GLOBAL_API_KEY, GOOGLE_API_KEY ou GEMINI_API_KEY nos Supabase Secrets.`,
    );
  }

  if (provider === "search" && !globalCX) {
    console.warn(
      "[getGlobalKey] CONFIG_WARNING: GOOGLE_SEARCH_CX ausente. A busca personalizada pode falhar.",
    );
  }

  // Log qual chave está sendo usada (sem expor o valor)
  const keySource = Deno.env.get("GOOGLE_GLOBAL_API_KEY")
    ? "GOOGLE_GLOBAL_API_KEY"
    : Deno.env.get("GOOGLE_API_KEY")
    ? "GOOGLE_API_KEY (fallback)"
    : "GEMINI_API_KEY (fallback)";
  console.log(`[getGlobalKey] Usando chave: ${keySource} para provider: ${provider}`);

  return {
    apiKey: globalKey,
    cx: globalCX,
  };
}


