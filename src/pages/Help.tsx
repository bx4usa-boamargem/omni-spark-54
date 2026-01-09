import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HelpSearchCommand } from "@/components/help/HelpSearchCommand";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  LayoutDashboard,
  FileText,
  Target,
  Sparkles,
  BookOpen,
  Lightbulb,
  BarChart3,
  Zap,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  ImageIcon,
  Layers,
  Globe,
} from "lucide-react";

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  icon: string;
  order_index: number;
  language?: string;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  Target,
  Sparkles,
  BookOpen,
  Lightbulb,
  BarChart3,
  Zap,
  TrendingUp,
  ImageIcon,
  Layers,
  Globe,
  Rocket: Sparkles,
};

const categoryLabels: Record<string, Record<string, string>> = {
  "pt-BR": {
    onboarding: "Primeiros Passos",
    dashboard: "Painel Principal",
    content: "Conteúdos",
    ebooks: "Ebooks",
    strategy: "Estratégia",
    performance: "Desempenho",
    automation: "Automações",
    integrations: "Integrações",
  },
  en: {
    onboarding: "Getting Started",
    dashboard: "Dashboard",
    content: "Content",
    ebooks: "Ebooks",
    strategy: "Strategy",
    performance: "Performance",
    automation: "Automations",
    integrations: "Integrations",
  },
  es: {
    onboarding: "Primeros Pasos",
    dashboard: "Panel Principal",
    content: "Contenidos",
    ebooks: "Ebooks",
    strategy: "Estrategia",
    performance: "Rendimiento",
    automation: "Automatizaciones",
    integrations: "Integraciones",
  },
};

const categoryColors: Record<string, string> = {
  onboarding: "bg-pink-500/10 text-pink-600",
  dashboard: "bg-blue-500/10 text-blue-600",
  content: "bg-emerald-500/10 text-emerald-600",
  ebooks: "bg-purple-500/10 text-purple-600",
  strategy: "bg-amber-500/10 text-amber-600",
  performance: "bg-rose-500/10 text-rose-600",
  automation: "bg-cyan-500/10 text-cyan-600",
  integrations: "bg-indigo-500/10 text-indigo-600",
};

const uiTexts: Record<string, Record<string, string>> = {
  "pt-BR": {
    title: "Central de Ajuda",
    subtitle: "Aprenda a usar todas as funcionalidades do sistema e tire o máximo proveito do seu blog.",
    noArticles: "Nenhum artigo encontrado neste idioma.",
    noArticlesAvailable: "Não encontrou o que procurava? Entre em contato conosco.",
    needMoreHelp: "Precisa de mais ajuda?",
    goToSettings: "Ir para Configurações",
    article: "artigo",
    articles: "artigos",
  },
  en: {
    title: "Help Center",
    subtitle: "Learn how to use all the features and get the most out of your blog.",
    noArticles: "No articles found in this language.",
    noArticlesAvailable: "Didn't find what you were looking for? Contact us.",
    needMoreHelp: "Need more help?",
    goToSettings: "Go to Settings",
    article: "article",
    articles: "articles",
  },
  es: {
    title: "Centro de Ayuda",
    subtitle: "Aprende a usar todas las funcionalidades del sistema y aprovecha al máximo tu blog.",
    noArticles: "No se encontraron artículos en este idioma.",
    noArticlesAvailable: "¿No encontraste lo que buscabas? Contáctanos.",
    needMoreHelp: "¿Necesitas más ayuda?",
    goToSettings: "Ir a Configuraciones",
    article: "artículo",
    articles: "artículos",
  },
};

export default function Help() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Map i18n language to supported help languages
  const getHelpLanguage = () => {
    const lang = i18n.language;
    if (lang.startsWith("pt")) return "pt-BR";
    if (lang.startsWith("es")) return "es";
    return "en";
  };

  const currentLang = getHelpLanguage();
  const texts = uiTexts[currentLang] || uiTexts["pt-BR"];
  const catLabels = categoryLabels[currentLang] || categoryLabels["pt-BR"];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      fetchArticles();
    }
  }, [user, authLoading, navigate, currentLang]);

  const fetchArticles = async () => {
    try {
      // First try to get articles in current language
      let { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .eq("is_published", true)
        .eq("language", currentLang)
        .order("order_index");

      // If no articles in current language, fall back to pt-BR
      if ((!data || data.length === 0) && currentLang !== "pt-BR") {
        const fallback = await supabase
          .from("help_articles")
          .select("*")
          .eq("is_published", true)
          .or(`language.eq.pt-BR,language.is.null`)
          .order("order_index");
        
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching help articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupedArticles = articles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold">{texts.title}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {texts.subtitle}
          </p>
          {/* Language Switcher */}
          <div className="flex justify-center">
            <LanguageSwitcher variant="outline" showName />
          </div>
        </div>

        {/* Smart Search */}
        <div className="max-w-xl mx-auto">
          <HelpSearchCommand articles={articles} />
        </div>

        {/* Categories and Articles */}
        {Object.entries(groupedArticles).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{texts.noArticles}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {Object.entries(groupedArticles).map(([category, categoryArticles]) => (
              <Card key={category}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={categoryColors[category]}>
                      {catLabels[category] || category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {categoryArticles.length} {categoryArticles.length === 1 ? texts.article : texts.articles}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryArticles.map((article) => {
                      const IconComponent = iconMap[article.icon] || HelpCircle;
                      return (
                        <Button
                          key={article.id}
                          variant="outline"
                          className="h-auto p-4 justify-start text-left hover:bg-accent group"
                          onClick={() => navigate(`/help/${article.slug}`)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="p-2 rounded-lg bg-muted shrink-0">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-2">{article.title}</h3>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">{texts.needMoreHelp}</h3>
                <p className="text-sm text-muted-foreground">
                  {texts.noArticlesAvailable}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/settings")}>
                {texts.goToSettings}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
