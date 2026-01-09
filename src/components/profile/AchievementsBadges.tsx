import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  FileText, 
  Eye, 
  Flame, 
  Target, 
  Users, 
  Sparkles, 
  BookOpen,
  TrendingUp,
  Award,
  Zap,
  Star,
  User,
  Image,
  Palette,
  Building2,
  Globe,
  MousePointer,
  CheckCircle2
} from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  condition: string;
  unlocked?: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Content achievements
  {
    id: "first_article",
    name: "Primeiro Passo",
    description: "Publique seu primeiro artigo",
    icon: <FileText className="h-5 w-5" />,
    condition: "1 artigo publicado",
  },
  {
    id: "articles_5",
    name: "Autor em Ascensão",
    description: "Publique 5 artigos",
    icon: <BookOpen className="h-5 w-5" />,
    condition: "5 artigos publicados",
    target: 5,
  },
  {
    id: "articles_10",
    name: "Autor Dedicado",
    description: "Publique 10 artigos",
    icon: <Award className="h-5 w-5" />,
    condition: "10 artigos publicados",
    target: 10,
  },
  {
    id: "articles_25",
    name: "Autor Prolífico",
    description: "Publique 25 artigos",
    icon: <Star className="h-5 w-5" />,
    condition: "25 artigos publicados",
    target: 25,
  },
  {
    id: "views_100",
    name: "Primeiros Leitores",
    description: "Atinja 100 visualizações",
    icon: <Eye className="h-5 w-5" />,
    condition: "100 visualizações",
    target: 100,
  },
  {
    id: "views_1000",
    name: "Audiência Crescente",
    description: "Atinja 1.000 visualizações",
    icon: <TrendingUp className="h-5 w-5" />,
    condition: "1.000 visualizações",
    target: 1000,
  },
  {
    id: "views_10000",
    name: "Viral em Potencial",
    description: "Atinja 10.000 visualizações",
    icon: <Zap className="h-5 w-5" />,
    condition: "10.000 visualizações",
    target: 10000,
  },
  {
    id: "streak_7",
    name: "Consistência",
    description: "Publique por 7 dias seguidos",
    icon: <Flame className="h-5 w-5" />,
    condition: "7 dias de publicações",
    target: 7,
  },
  {
    id: "cta_master",
    name: "Mestre da Conversão",
    description: "Atinja taxa de CTA acima de 10%",
    icon: <Target className="h-5 w-5" />,
    condition: "CTA rate ≥ 10%",
  },
  {
    id: "read_champion",
    name: "Campeão de Leitura",
    description: "Taxa de leitura completa acima de 50%",
    icon: <Trophy className="h-5 w-5" />,
    condition: "Read rate ≥ 50%",
  },
  {
    id: "seo_pro",
    name: "SEO Expert",
    description: "Publique um artigo com score SEO 90+",
    icon: <Sparkles className="h-5 w-5" />,
    condition: "Score SEO ≥ 90",
  },
  {
    id: "team_builder",
    name: "Construtor de Equipe",
    description: "Convide seu primeiro membro",
    icon: <Users className="h-5 w-5" />,
    condition: "1 membro na equipe",
  },
  // Onboarding/checklist achievements
  {
    id: "profile_ready",
    name: "Perfil Completo",
    description: "Complete seu perfil com nome e foto",
    icon: <User className="h-5 w-5" />,
    condition: "Nome e avatar configurados",
  },
  {
    id: "brand_ready",
    name: "Identidade Visual",
    description: "Configure logo e cores do blog",
    icon: <Palette className="h-5 w-5" />,
    condition: "Logo e cores definidos",
  },
  {
    id: "business_defined",
    name: "Negócio Definido",
    description: "Configure o perfil do seu negócio",
    icon: <Building2 className="h-5 w-5" />,
    condition: "Nicho e descrição preenchidos",
  },
  {
    id: "library_seeded",
    name: "Biblioteca Ativa",
    description: "Adicione material à biblioteca",
    icon: <BookOpen className="h-5 w-5" />,
    condition: "1+ documento na biblioteca",
  },
  {
    id: "audience_defined",
    name: "Público Definido",
    description: "Crie uma persona do seu público",
    icon: <Users className="h-5 w-5" />,
    condition: "1+ persona criada",
  },
  {
    id: "competitors_mapped",
    name: "Concorrência Mapeada",
    description: "Adicione um concorrente",
    icon: <Globe className="h-5 w-5" />,
    condition: "1+ concorrente adicionado",
  },
  {
    id: "keywords_started",
    name: "SEO Iniciado",
    description: "Configure suas palavras-chave",
    icon: <Target className="h-5 w-5" />,
    condition: "1+ análise de keyword",
  },
  {
    id: "cta_configured",
    name: "CTA Configurado",
    description: "Configure sua chamada para ação",
    icon: <MousePointer className="h-5 w-5" />,
    condition: "CTA do blog definido",
  },
  {
    id: "onboarding_master",
    name: "Configuração Completa",
    description: "Complete todas as etapas do checklist",
    icon: <CheckCircle2 className="h-5 w-5" />,
    condition: "100% do checklist completo",
  },
];

interface AchievementsBadgesProps {
  userId: string;
  blogId: string;
  compact?: boolean;
}

export function AchievementsBadges({ userId, blogId, compact = false }: AchievementsBadgesProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    articlesPublished: 0,
    totalViews: 0,
  });

  useEffect(() => {
    fetchAchievements();
  }, [userId, blogId]);

  const fetchAchievements = async () => {
    try {
      // Fetch unlocked achievements
      const { data: unlockedData } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", userId)
        .eq("blog_id", blogId);

      const unlockedMap = new Map(
        (unlockedData || []).map((a) => [a.achievement_id, a.unlocked_at])
      );

      // Fetch stats for progress
      const { data: articlesData } = await supabase
        .from("articles")
        .select("id, view_count")
        .eq("blog_id", blogId)
        .eq("status", "published");

      const articlesPublished = articlesData?.length || 0;
      const totalViews = articlesData?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;

      setStats({ articlesPublished, totalViews });

      // Map achievements with unlocked status and progress
      const mappedAchievements = ACHIEVEMENT_DEFINITIONS.map((def) => {
        const unlocked = unlockedMap.has(def.id);
        let progress = 0;

        // Calculate progress for certain achievements
        if (def.id.startsWith("articles_") && def.target) {
          progress = Math.min(100, (articlesPublished / def.target) * 100);
        } else if (def.id.startsWith("views_") && def.target) {
          progress = Math.min(100, (totalViews / def.target) * 100);
        } else if (def.id === "first_article") {
          progress = articlesPublished > 0 ? 100 : 0;
        }

        return {
          ...def,
          unlocked,
          unlockedAt: unlockedMap.get(def.id),
          progress,
        };
      });

      setAchievements(mappedAchievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    const unlocked = achievements.filter((a) => a.unlocked);
    const nextUp = achievements.filter((a) => !a.unlocked && (a.progress || 0) > 0).slice(0, 3);

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Conquistas
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {unlockedCount} / {totalCount}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unlocked */}
          {unlocked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {unlocked.slice(0, 6).map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-2 rounded-lg bg-primary/10 text-primary"
                  title={achievement.name}
                >
                  {achievement.icon}
                </div>
              ))}
              {unlocked.length > 6 && (
                <div className="p-2 rounded-lg bg-muted text-muted-foreground text-xs flex items-center justify-center min-w-[36px]">
                  +{unlocked.length - 6}
                </div>
              )}
            </div>
          )}

          {/* Next up with progress */}
          {nextUp.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Próximas conquistas:</p>
              {nextUp.map((achievement) => (
                <div key={achievement.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="opacity-50">{achievement.icon}</span>
                      {achievement.name}
                    </span>
                    <span className="text-muted-foreground">{Math.round(achievement.progress || 0)}%</span>
                  </div>
                  <Progress value={achievement.progress} className="h-1" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Suas Conquistas ({unlockedCount} de {totalCount})
        </CardTitle>
        <CardDescription>Complete desafios para desbloquear badges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unlocked Achievements */}
        {unlocked.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-success flex items-center gap-2">
              ✓ Desbloqueadas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {unlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center space-y-1"
                >
                  <div className="mx-auto text-primary">{achievement.icon}</div>
                  <p className="text-xs font-medium">{achievement.name}</p>
                  {achievement.unlockedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(achievement.unlockedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {locked.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Próximas conquistas</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {locked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border text-center space-y-1.5 opacity-70"
                >
                  <div className="mx-auto text-muted-foreground">{achievement.icon}</div>
                  <p className="text-xs font-medium">{achievement.name}</p>
                  <p className="text-[10px] text-muted-foreground">{achievement.condition}</p>
                  {(achievement.progress || 0) > 0 && (
                    <Progress value={achievement.progress} className="h-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
