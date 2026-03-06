import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OutlineData } from "./blueprintBuilder.ts";
import { JobInput } from "../types/agentTypes.ts";
import { injectImagesIntoContent, validateContentStructure } from "../../_shared/imageInjector.ts";

const GEMINI_IMAGE_MODEL = "google/gemini-2.5-flash-image";
const LOVABLE_IMAGE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function generateOneImage(prompt: string, apiKey: string): Promise<{ url: string; base64?: string } | null> {
    const res = await fetch(LOVABLE_IMAGE_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: GEMINI_IMAGE_MODEL,
            messages: [{ role: "user", content: `Generate a professional, realistic 16:9 image for a blog. ${prompt}. Style: editorial, high quality.` }],
            modalities: ["image", "text"],
        }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl?.startsWith("data:")) return null;
    return { url: imageUrl, base64: imageUrl };
}

export async function executeImageGenerator(
    articleId: string | null,
    articleData: Record<string, unknown>,
    outline: OutlineData,
    jobInput: JobInput,
    supabase: ReturnType<typeof createClient>,
    userClient: ReturnType<typeof createClient>
): Promise<Record<string, unknown>> {
    if (!articleId) return { skipped: true, reason: "no_article_id" };
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return { skipped: true, reason: "LOVABLE_API_KEY not set" };

    const heroPrompt = (articleData.image_prompt as string) || (articleData.title as string) || (jobInput.keyword as string) || "professional blog";
    const keyword = (jobInput.keyword as string) || "article";
    const slug = keyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const contentImages: { context: string; url: string; alt?: string; after_section: number }[] = [];
    let heroUrl: string | null = null;
    let heroAlt: string | null = null;

    try {
        const hero = await generateOneImage(heroPrompt, apiKey);
        if (hero?.url) {
            const base64Match = hero.url.match(/^data:image\/(\w+);base64,(.+)$/);
            if (base64Match) {
                const fmt = base64Match[1];
                const bin = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));
                const fname = `${articleId}-hero.${fmt}`;
                await supabase.storage.from("article-images").upload(fname, bin, { contentType: `image/${fmt}`, upsert: true });
                const { data: pub } = supabase.storage.from("article-images").getPublicUrl(fname);
                heroUrl = pub.publicUrl;
                heroAlt = (articleData.title as string) || keyword;
            }
        }
        if (!heroUrl) {
            heroUrl = `https://picsum.photos/seed/${slug}-hero/1024/576`;
            heroAlt = `${keyword} — imagem ilustrativa`;
        }
        await userClient.from("articles").update({ featured_image_url: heroUrl, featured_image_alt: heroAlt }).eq("id", articleId);

        const html = (articleData.html_article as string) || "";
        const sectionCount = (html.match(/<h2[^>]*>/gi) || []).length;
        const maxSectionImages = Math.min(sectionCount, 8);

        for (let i = 0; i < maxSectionImages; i++) {
            const sectionTitle = outline.h2[i]?.title || `Section ${i + 1}`;
            const prompt = `${keyword}, ${sectionTitle}. Editorial, realistic.`;
            const img = await generateOneImage(prompt, apiKey);
            let url: string;
            if (img?.url && img.url.startsWith("data:")) {
                const base64Match = img.url.match(/^data:image\/(\w+);base64,(.+)$/);
                if (base64Match) {
                    const fmt = base64Match[1];
                    const bin = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));
                    const fname = `${articleId}-section-${i + 1}-${Date.now()}.${fmt}`;
                    await supabase.storage.from("article-images").upload(fname, bin, { contentType: `image/${fmt}`, upsert: true });
                    const { data: pub } = supabase.storage.from("article-images").getPublicUrl(fname);
                    url = pub.publicUrl;
                } else continue;
            } else url = `https://picsum.photos/seed/${slug}-sec-${i}/800/450`;
            contentImages.push({ context: sectionTitle, url, alt: sectionTitle, after_section: i + 1 });
        }

        if (contentImages.length > 0 && validateContentStructure(html)) {
            const injected = injectImagesIntoContent(html, contentImages.map((c) => ({ ...c, alt: c.alt })));
            if (injected.injected > 0) {
                await userClient.from("articles").update({ content: injected.content, content_images: contentImages }).eq("id", articleId);
            }
        }
        return { success: true, heroUrl, sectionCount: contentImages.length };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const fallback = `https://picsum.photos/seed/${slug}-hero/1024/576`;
        await userClient.from("articles").update({ featured_image_url: fallback, featured_image_alt: `${keyword} — imagem ilustrativa` }).eq("id", articleId);
        return { success: false, fallback: true, error: msg };
    }
}
