import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  BookOpen,
  User,
  Globe,
  Target,
  Sparkles,
  Info,
  Settings2,
  ChevronDown,
  ChevronUp,
  Radar,
  Lightbulb
} from "lucide-react";
import { MarketRadarTab } from "@/components/client/strategy/MarketRadarTab";
import { ClientOpportunitiesTab } from "@/components/client/strategy/ClientOpportunitiesTab";
import { SectionHelper } from "@/components/blog-editor/SectionHelper";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UniversalStrategyTab } from "@/components/strategy/UniversalStrategyTab";
import { BusinessTab } from "@/components/strategy/BusinessTab";
import { LibraryTab } from "@/components/strategy/LibraryTab";
import { AudienceTab } from "@/components/strategy/AudienceTab";
import { CompetitorsTab } from "@/components/strategy/CompetitorsTab";
import { KeywordsTab } from "@/components/strategy/KeywordsTab";
import { SimpleKeywordsSection } from "@/components/strategy/SimpleKeywordsSection";

interface BusinessProfile {
  id?: string;
  blog_id: string;
  project_name: string;
  language: string;
  country: string;
  niche: string;
  target_audience: string;
  tone_of_voice: string;
  long_description: string;
  concepts: string[];
  pain_points: string[];
  desires: string[];
  brand_keywords: string[];
  is_library_enabled: boolean;
}

interface Persona {
  id: string;
  name: string;
  age_range: string;
  profession: string;
  goals: string[];
  challenges: string[];
  description: string;
  problems: string[];
  solutions: string[];
  objections: string[];
}

interface LibraryItem {
  id: string;
  type: "image" | "document";
  file_url: string;
  file_name: string;
  description: string | null;
  is_active: boolean;
}

interface KeywordSuggestion {
  keyword: string;
  type: string;
}

interface KeywordAnalysis {
  id: string;
  keyword: string;
  difficulty: number | null;
  search_volume: number | null;
  suggestions: KeywordSuggestion[];
  analyzed_at: string;
}

export default function Strategy() {
  const { user } = useAuth();
  const { blog, loading: blogLoading } = useBlog();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Business Profile State
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    blog_id: "",
    project_name: "",
    language: "pt-BR",
    country: "Brasil",
    niche: "",
    target_audience: "",
    tone_of_voice: "friendly",
    long_description: "",
    concepts: [],
    pain_points: [],
    desires: [],
    brand_keywords: [],
    is_library_enabled: false,
  });

  // Personas State
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Library State
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  // Keyword Analysis State
  const [keywordAnalyses, setKeywordAnalyses] = useState<KeywordAnalysis[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !blog) return;

      try {
        // Fetch business profile
        const { data: profileData } = await supabase
          .from("business_profile")
          .select("*")
          .eq("blog_id", blog.id)
          .maybeSingle();

        if (profileData) {
          setBusinessProfile({
            id: profileData.id,
            blog_id: profileData.blog_id,
            project_name: profileData.project_name || "",
            language: profileData.language || "pt-BR",
            country: profileData.country || "Brasil",
            niche: profileData.niche || "",
            target_audience: profileData.target_audience || "",
            tone_of_voice: profileData.tone_of_voice || "friendly",
            long_description: profileData.long_description || "",
            concepts: profileData.concepts || [],
            pain_points: profileData.pain_points || [],
            desires: profileData.desires || [],
            brand_keywords: profileData.brand_keywords || [],
            is_library_enabled: profileData.is_library_enabled || false,
          });
        } else {
          setBusinessProfile((prev) => ({ ...prev, blog_id: blog.id }));
        }

        // Fetch personas
        const { data: personasData } = await supabase
          .from("personas")
          .select("*")
          .eq("blog_id", blog.id)
          .order("created_at", { ascending: false });

        if (personasData) {
          setPersonas(
            personasData.map((p) => ({
              id: p.id,
              name: p.name,
              age_range: p.age_range || "",
              profession: p.profession || "",
              goals: p.goals || [],
              challenges: p.challenges || [],
              description: p.description || "",
              problems: p.problems || [],
              solutions: p.solutions || [],
              objections: p.objections || [],
            })),
          );
        }

        // Fetch library items
        const { data: libraryData } = await supabase
          .from("user_library")
          .select("*")
          .eq("blog_id", blog.id)
          .order("created_at", { ascending: false });

        if (libraryData) {
          setLibraryItems(libraryData as LibraryItem[]);
        }

        // Fetch keyword analyses history
        const { data: keywordsData } = await supabase
          .from("keyword_analyses")
          .select("*")
          .eq("blog_id", blog.id)
          .order("analyzed_at", { ascending: false })
          .limit(20);

        if (keywordsData) {
          setKeywordAnalyses(
            keywordsData.map((item) => ({
              id: item.id,
              keyword: item.keyword,
              difficulty: item.difficulty,
              search_volume: item.search_volume,
              suggestions: (item.suggestions as unknown as KeywordSuggestion[]) || [],
              analyzed_at: item.analyzed_at,
            })),
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (blog) {
      fetchData();
    } else if (!blogLoading) {
      setLoading(false);
    }
  }, [user, blog, blogLoading]);

  const blogId = blog?.id || null;

  const handleUpdateBusinessProfile = async (data: Partial<BusinessProfile>) => {
    if (!businessProfile.id) return;

    try {
      await supabase
        .from("business_profile")
        .update(data)
        .eq("id", businessProfile.id);

      setBusinessProfile((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error("Error updating business profile:", error);
      toast.error("Erro ao atualizar configurações");
    }
  };

  if (loading || blogLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Estratégia</h1>
          <SectionHelper
            title="Estratégia de Conteúdo"
            description="Informações do seu negócio para personalizar artigos gerados pela IA."
          />
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="strategy" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50 w-full sm:w-auto border">
            <TabsTrigger value="strategy" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Estratégia</span>
            </TabsTrigger>
            <TabsTrigger value="radar" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Radar className="h-4 w-4" />
              <span className="hidden sm:inline">Radar</span>
            </TabsTrigger>
            <TabsTrigger value="competitors" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Concorrentes</span>
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Oportunidades</span>
            </TabsTrigger>
          </TabsList>

          {/* Estratégia Tab (Universal Strategy + Business combined like V1 idea) */}
          <TabsContent value="strategy" className="space-y-6">
            {blogId && (
              <>
                <UniversalStrategyTab blogId={blogId} />
                <div className="mt-8 border-t pt-8">
                  <h3 className="text-xl font-display font-semibold mb-4">Configuração Avançada de Negócio (Opcional)</h3>
                  <BusinessTab
                    blogId={blogId}
                    businessProfile={businessProfile}
                    setBusinessProfile={setBusinessProfile}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Radar Tab */}
          <TabsContent value="radar">
            {blogId && <MarketRadarTab blogId={blogId} />}
          </TabsContent>

          {/* Concorrentes Tab */}
          <TabsContent value="competitors">
            {blogId && <CompetitorsTab blogId={blogId} />}
          </TabsContent>

          {/* Oportunidades Tab */}
          <TabsContent value="opportunities">
            {blogId && <ClientOpportunitiesTab blogId={blogId} />}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
