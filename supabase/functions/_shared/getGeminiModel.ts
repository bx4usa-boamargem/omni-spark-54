export function getGeminiModel() {
  return Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
}

