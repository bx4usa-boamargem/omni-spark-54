import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AchievementCheck {
  id: string;
  name: string;
  check: (stats: Stats) => boolean;
}

interface Stats {
  articlesPublished: number;
  totalViews: number;
  ctaRate: number;
  readRate: number;
  teamMembers: number;
  ebooksCreated: number;
  maxSeoScore: number;
  publishStreak: number;
  // Onboarding checklist stats
  hasProfile: boolean;
  hasLogo: boolean;
  hasColors: boolean;
  hasBusiness: boolean;
  hasLibrary: boolean;
  hasPersona: boolean;
  hasCompetitor: boolean;
  hasKeywords: boolean;
  hasCta: boolean;
  checklistComplete: number; // percentage 0-100
}

const ACHIEVEMENTS: AchievementCheck[] = [
  // Original article/content achievements
  { id: "first_article", name: "Primeiro Passo", check: (s) => s.articlesPublished >= 1 },
  { id: "articles_5", name: "Autor em Ascensão", check: (s) => s.articlesPublished >= 5 },
  { id: "articles_10", name: "Autor Dedicado", check: (s) => s.articlesPublished >= 10 },
  { id: "articles_25", name: "Autor Prolífico", check: (s) => s.articlesPublished >= 25 },
  { id: "articles_50", name: "Mestre do Conteúdo", check: (s) => s.articlesPublished >= 50 },
  { id: "views_100", name: "Primeiros Leitores", check: (s) => s.totalViews >= 100 },
  { id: "views_1000", name: "Audiência Crescente", check: (s) => s.totalViews >= 1000 },
  { id: "views_10000", name: "Viral em Potencial", check: (s) => s.totalViews >= 10000 },
  { id: "streak_7", name: "Consistência", check: (s) => s.publishStreak >= 7 },
  { id: "streak_30", name: "Disciplina de Ferro", check: (s) => s.publishStreak >= 30 },
  { id: "cta_master", name: "Mestre da Conversão", check: (s) => s.ctaRate >= 10 },
  { id: "read_champion", name: "Campeão de Leitura", check: (s) => s.readRate >= 50 },
  { id: "seo_pro", name: "SEO Expert", check: (s) => s.maxSeoScore >= 90 },
  { id: "ebook_creator", name: "Autor de E-book", check: (s) => s.ebooksCreated >= 1 },
  { id: "team_builder", name: "Construtor de Equipe", check: (s) => s.teamMembers >= 1 },
  
  // New onboarding/checklist achievements
  { id: "profile_ready", name: "Perfil Completo", check: (s) => s.hasProfile },
  { id: "brand_ready", name: "Identidade Visual", check: (s) => s.hasLogo && s.hasColors },
  { id: "business_defined", name: "Negócio Definido", check: (s) => s.hasBusiness },
  { id: "library_seeded", name: "Biblioteca Ativa", check: (s) => s.hasLibrary },
  { id: "audience_defined", name: "Público Definido", check: (s) => s.hasPersona },
  { id: "competitors_mapped", name: "Concorrência Mapeada", check: (s) => s.hasCompetitor },
  { id: "keywords_started", name: "SEO Iniciado", check: (s) => s.hasKeywords },
  { id: "cta_configured", name: "CTA Configurado", check: (s) => s.hasCta },
  { id: "onboarding_master", name: "Configuração Completa", check: (s) => s.checklistComplete >= 100 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { userId, blogId } = await req.json();

    if (!userId || !blogId) {
      throw new Error("Missing userId or blogId");
    }

    // Fetch all stats in parallel
    const [
      articlesResult,
      funnelResult,
      teamResult,
      ebooksResult,
      profileResult,
      blogResult,
      businessResult,
      libraryResult,
      personasResult,
      competitorsResult,
      keywordsResult
    ] = await Promise.all([
      supabase.from("articles").select("id, view_count, published_at").eq("blog_id", blogId).eq("status", "published"),
      supabase.from("funnel_events").select("event_type").eq("blog_id", blogId).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from("team_members").select("id").eq("blog_id", blogId).eq("status", "active"),
      supabase.from("ebooks").select("id").eq("blog_id", blogId).eq("status", "published"),
      supabase.from("profiles").select("full_name, avatar_url").eq("user_id", userId).single(),
      supabase.from("blogs").select("logo_url, primary_color, cta_text").eq("id", blogId).single(),
      supabase.from("business_profile").select("niche, long_description").eq("blog_id", blogId).maybeSingle(),
      supabase.from("user_library").select("id").eq("blog_id", blogId).limit(1),
      supabase.from("personas").select("id").eq("blog_id", blogId).limit(1),
      supabase.from("competitors").select("id").eq("blog_id", blogId).limit(1),
      supabase.from("keyword_analyses").select("id").eq("blog_id", blogId).limit(1)
    ]);

    const articles = articlesResult.data || [];
    const articlesPublished = articles.length;
    const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);

    // Calculate publish streak (consecutive days)
    let publishStreak = 0;
    if (articles.length > 0) {
      const dates = articles
        .filter((a) => a.published_at)
        .map((a) => new Date(a.published_at!).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
        .reverse();

      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (dates[0] === today || dates[0] === yesterday) {
        publishStreak = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diffDays = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
          if (diffDays === 1) {
            publishStreak++;
          } else {
            break;
          }
        }
      }
    }

    // CTA and read rates
    const funnelEvents = funnelResult.data || [];
    let ctaRate = 0;
    let readRate = 0;

    if (funnelEvents.length > 0) {
      const pageEnters = funnelEvents.filter((e) => e.event_type === "page_enter").length;
      const ctaClicks = funnelEvents.filter((e) => e.event_type === "cta_click").length;
      const scroll100 = funnelEvents.filter((e) => e.event_type === "scroll_100").length;

      if (pageEnters > 0) {
        ctaRate = (ctaClicks / pageEnters) * 100;
        readRate = (scroll100 / pageEnters) * 100;
      }
    }

    // Checklist status
    const profile = profileResult.data;
    const blog = blogResult.data;
    const business = businessResult.data;

    const hasProfile = !!(profile?.full_name && profile?.avatar_url);
    const hasLogo = !!blog?.logo_url;
    const hasColors = !!blog?.primary_color && blog.primary_color !== '#F97316';
    const hasBusiness = !!(business?.niche && business?.long_description);
    const hasLibrary = (libraryResult.data?.length ?? 0) > 0;
    const hasPersona = (personasResult.data?.length ?? 0) > 0;
    const hasCompetitor = (competitorsResult.data?.length ?? 0) > 0;
    const hasKeywords = (keywordsResult.data?.length ?? 0) > 0;
    const hasCta = !!blog?.cta_text;
    const hasFirstArticle = articlesPublished >= 1;

    // Calculate checklist completion percentage (10 items)
    const completedItems = [
      hasProfile,
      hasLogo,
      hasColors,
      hasBusiness,
      hasLibrary,
      hasPersona,
      hasCompetitor,
      hasKeywords,
      hasFirstArticle,
      hasCta
    ].filter(Boolean).length;
    const checklistComplete = (completedItems / 10) * 100;

    const stats: Stats = {
      articlesPublished,
      totalViews,
      ctaRate,
      readRate,
      teamMembers: teamResult.data?.length || 0,
      ebooksCreated: ebooksResult.data?.length || 0,
      maxSeoScore: 0,
      publishStreak,
      hasProfile,
      hasLogo,
      hasColors,
      hasBusiness,
      hasLibrary,
      hasPersona,
      hasCompetitor,
      hasKeywords,
      hasCta,
      checklistComplete,
    };

    // Get already unlocked achievements
    const { data: existingAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId)
      .eq("blog_id", blogId);

    const unlockedIds = new Set((existingAchievements || []).map((a) => a.achievement_id));

    // Check for new achievements
    const newAchievements: { id: string; name: string }[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (!unlockedIds.has(achievement.id) && achievement.check(stats)) {
        // Unlock this achievement
        const { error } = await supabase.from("user_achievements").insert({
          user_id: userId,
          blog_id: blogId,
          achievement_id: achievement.id,
          notified: false,
        });

        if (!error) {
          newAchievements.push({ id: achievement.id, name: achievement.name });
        }
      }
    }

    // Create notifications for new achievements
    for (const achievement of newAchievements) {
      await supabase.from("opportunity_notification_history").insert({
        user_id: userId,
        blog_id: blogId,
        opportunity_id: blogId,
        notification_type: "achievement",
        title: `🏆 Nova Conquista: ${achievement.name}!`,
        message: `Parabéns! Você desbloqueou a conquista "${achievement.name}".`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        newAchievements,
        totalUnlocked: unlockedIds.size + newAchievements.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking achievements:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
