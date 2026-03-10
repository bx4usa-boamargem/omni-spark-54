import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OutlineData } from "./blueprintBuilder.ts";
import { JobInput } from "../types/agentTypes.ts";
import { injectImagesIntoContent, validateContentStructure } from "../../_shared/imageInjector.ts";

const GEMINI_IMAGE_MODEL = "google/gemini-2.5-flash-image";
const LOVABLE_IMAGE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PLACES_API_BASE = "https://maps.googleapis.com/maps/api";

// ============================================================================
// GOOGLE PLACES PHOTOS API — Primary source for local images
// ============================================================================

interface PlacePhoto {
    url: string;
    attributions: string[];
}

/**
 * Busca fotos reais de um local/cidade via Google Places Photos API.
 * Usa textSearch para encontrar lugares relevantes e retorna a foto do lugar.
 * Ex: "dedetização Recife Pernambuco" → fotos reais do local/bairro.
 */
async function fetchPlacesPhoto(
    keyword: string,
    city: string,
    niche: string,
    apiKey: string,
    maxWidth = 1024
): Promise<PlacePhoto | null> {
    try {
        // Monta a query de busca: nicho + cidade para encontrar o local relevante
        const nicheMap: Record<string, string> = {
            pest_control: "dedetização dedetizadora",
            plumbing: "encanador hidráulica",
            dental: "dentista odontologia",
            legal: "advogado escritório advocacia",
            accounting: "contador contabilidade",
            real_estate: "imobiliária corretor imóveis",
            technology: "empresa tecnologia TI informática",
            cleaning: "limpeza serviços domésticos",
            electrician: "eletricista elétrica",
            painting: "pintor pintura",
        };

        const nicheQuery = nicheMap[niche] || keyword;
        const searchQuery = `${nicheQuery} ${city}`;

        // 1. Text Search para encontrar lugares relevantes
        const searchUrl = `${PLACES_API_BASE}/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=pt-BR`;
        // timeout explícito em ambas as chamadas HTTP
        const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8_000) });

        if (!searchRes.ok) {
            console.warn(`[PLACES_API] textSearch HTTP ${searchRes.status} para "${searchQuery}"`);
            return null;
        }

        const searchData = await searchRes.json();
        const results = searchData.results as Array<{ place_id: string; photos?: Array<{ photo_reference: string; html_attributions: string[] }> }>;

        if (!results?.length) return null;

        // Procura um resultado que tenha foto
        let photoRef: string | null = null;
        let attribution: string[] = [];
        for (const place of results.slice(0, 5)) {
            if (place.photos?.[0]?.photo_reference) {
                photoRef = place.photos[0].photo_reference;
                attribution = place.photos[0].html_attributions || [];
                break;
            }
        }

        if (!photoRef) return null;

        // 2. Busca a URL da foto via Places Photos API
        const photoUrl = `${PLACES_API_BASE}/place/photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}&key=${apiKey}`;

        // A API do Places redireciona para a imagem; precisamos pegar a URL final
        const photoRes = await fetch(photoUrl, {
            redirect: "follow",
            signal: AbortSignal.timeout(8000),
        });

        if (!photoRes.ok) return null;

        // Retorna a URL final (após redirect)
        return { url: photoRes.url, attributions: attribution };
    } catch (e) {
        console.warn("[PLACES_API] Erro ao buscar foto:", e);
        return null;
    }
}

// ============================================================================
// GEMINI IMAGE GENERATION — Secondary (IA generativa)
// ============================================================================

async function generateOneImage(prompt: string, apiKey: string): Promise<{ url: string; base64?: string } | null> {
    const res = await fetch(LOVABLE_IMAGE_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: GEMINI_IMAGE_MODEL,
            messages: [{ role: "user", content: `Generate a professional, realistic 16:9 image for a blog. ${prompt}. Style: editorial, high quality. Photorealistic. No text, no logos.` }],
            modalities: ["image", "text"],
        }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl?.startsWith("data:")) return null;
    return { url: imageUrl, base64: imageUrl };
}

// ============================================================================
// UPLOAD HELPER — Sobe base64 para Supabase Storage
// ============================================================================

async function uploadBase64Image(
    base64DataUri: string,
    filename: string,
    supabase: ReturnType<typeof createClient>
): Promise<string | null> {
    const match = base64DataUri.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return null;
    const fmt = match[1];
    const bin = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    const fname = `${filename}.${fmt}`;
    await supabase.storage.from("article-images").upload(fname, bin, { contentType: `image/${fmt}`, upsert: true });
    const { data: pub } = supabase.storage.from("article-images").getPublicUrl(fname);
    return pub.publicUrl;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function executeImageGenerator(
    articleId: string | null,
    articleData: Record<string, unknown>,
    outline: OutlineData,
    jobInput: JobInput,
    supabase: ReturnType<typeof createClient>,
    userClient: ReturnType<typeof createClient>
): Promise<Record<string, unknown>> {
    if (!articleId) return { skipped: true, reason: "no_article_id" };

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GOOGLE_PLACES_API_KEY");

    const keyword = (jobInput.keyword as string) || "serviço local";
    const city = (jobInput.city as string) || "";
    const niche = (jobInput.niche as string) || "business";

    const contentImages: { context: string; url: string; alt?: string; after_section: number }[] = [];
    let heroUrl: string | null = null;
    let heroAlt: string | null = null;

    try {
        // ── HERO IMAGE ─────────────────────────────────────────────────────────
        // Prioridade 1: Google Places Photos (imagem real da localidade)
        if (googleApiKey && city) {
            const placesHero = await fetchPlacesPhoto(keyword, city, niche, googleApiKey, 1024);
            if (placesHero?.url) {
                heroUrl = placesHero.url;
                heroAlt = `${keyword} em ${city}`;
                console.log(`[IMAGE_GEN] Hero: Google Places foto obtida para "${keyword} ${city}"`);
            }
        }

        // Prioridade 2: IA generativa (Gemini via Lovable Gateway)
        if (!heroUrl && lovableApiKey) {
            const heroPrompt = (articleData.image_prompt as string) || `${keyword} ${city} professional service`.trim();
            try {
                const hero = await Promise.race([
                    generateOneImage(heroPrompt, lovableApiKey),
                    new Promise<null>((_, reject) => setTimeout(() => reject(new Error("HERO_IMG_TIMEOUT")), 18000)),
                ]);
                if (hero?.url) {
                    const uploadedUrl = await uploadBase64Image(hero.url, `${articleId}-hero`, supabase);
                    if (uploadedUrl) {
                        heroUrl = uploadedUrl;
                        heroAlt = (articleData.title as string) || keyword;
                        console.log("[IMAGE_GEN] Hero: Gemini gerou imagem.");
                    }
                }
            } catch (e) {
                console.warn("[IMAGE_GEN] Hero IA falhou:", e);
            }
        }

        // Se obteve hero, persiste
        if (heroUrl) {
            await userClient.from("articles").update({ featured_image_url: heroUrl, featured_image_alt: heroAlt }).eq("id", articleId);
        } else {
            console.warn("[IMAGE_GEN] Hero: nenhuma imagem disponível. Campo featured_image_url não atualizado.");
        }

        // ── SECTION IMAGES ──────────────────────────────────────────────────────
        const html = (articleData.html_article as string) || "";
        const sectionCount = (html.match(/<h2[^>]*>/gi) || []).length;
        // Máx 3 imagens de seção: suficiente para artigo padrão sem estourar quota
        const maxSectionImages = Math.min(sectionCount, 3);

        // Série (não paralelo) para evitar rate-limit em burst na Places API
        const generatedImages: NonNullable<{ context: string; url: string; alt?: string; after_section: number }>[] = [];

        for (let i = 0; i < maxSectionImages; i++) {
            const sectionTitle = outline.h2[i]?.title || `Seção ${i + 1}`;

            // Prioridade 1: Google Places com contexto da seção
            if (googleApiKey && city) {
                const sectionQuery = `${sectionTitle} ${city}`;
                try {
                    const placesImg = await fetchPlacesPhoto(sectionQuery, city, niche, googleApiKey, 800);
                    if (placesImg?.url) {
                        console.log(`[IMAGE_GEN] Seção ${i + 1}: Google Places → "${sectionTitle}"`);
                        generatedImages.push({ context: sectionTitle, url: placesImg.url, alt: `${sectionTitle} em ${city}`, after_section: i + 1 });
                        continue;
                    }
                } catch (e) {
                    console.warn(`[IMAGE_GEN] Seção ${i + 1}: Places falhou:`, e instanceof Error ? e.message : String(e));
                }
            }

            // Prioridade 2: IA generativa (se Places falhou)
            if (lovableApiKey) {
                const prompt = `${keyword} - ${sectionTitle}. ${city ? `Cidade: ${city}.` : ""} Editorial realista, sem texto.`;
                try {
                    const img = await Promise.race([
                        generateOneImage(prompt, lovableApiKey),
                        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("IMG_TIMEOUT")), 15_000)),
                    ]);
                    if (img?.url) {
                        const fname = `${articleId}-section-${i + 1}-${Date.now()}`;
                        const uploadedUrl = await uploadBase64Image(img.url, fname, supabase);
                        if (uploadedUrl) {
                            generatedImages.push({ context: sectionTitle, url: uploadedUrl, alt: sectionTitle, after_section: i + 1 });
                            continue;
                        }
                    }
                } catch (e) {
                    console.warn(`[IMAGE_GEN] Seção ${i + 1} IA falhou:`, e instanceof Error ? e.message : String(e));
                }
            }

            // Sem imagem: prefere ausência a imagem irrelevante
            console.warn(`[IMAGE_GEN] Seção ${i + 1}: nenhuma imagem encontrada — seguindo sem imagem.`);
        }
        contentImages.push(...generatedImages);

        if (contentImages.length > 0 && validateContentStructure(html)) {
            const injected = injectImagesIntoContent(html, contentImages.map((c) => ({ ...c, alt: c.alt })));
            if (injected.injected > 0) {
                await userClient.from("articles").update({ content: injected.content, content_images: contentImages }).eq("id", articleId);
            }
        }

        return { success: true, heroUrl, sectionCount: contentImages.length };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[IMAGE_GEN] Erro geral:", msg);
        // Não insere imagem alguma no fallback — melhor sem imagem que com imagem errada
        return { success: false, fallback: false, error: msg };
    }
}
