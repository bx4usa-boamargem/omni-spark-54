import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBlog } from '@/hooks/useBlog';
import { useRadarV3Flag } from '@/hooks/useRadarV3Flag';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Radar, Loader2, RefreshCw, Sparkles, Target, TrendingUp,
    Zap, Eye, Brain, Shield, AlertTriangle, Clock, Search,
    ArrowUpRight, ChevronRight, Lightbulb, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BlogRequiredState } from '@/components/client/BlogRequiredState';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// Types
// ============================================================================
interface RadarV3Opportunity {
    id: string;
    title: string;
    keywords: string[];
    relevance_score: number;
    status: string;
    why_now: string | null;
    search_intent: string | null;
    content_type: string | null;
    funnel_stage: string | null;
    estimated_volume: number | null;
    competition_level: string | null;
    eeat_signals: Record<string, unknown>;
    helpful_content: Record<string, unknown>;
    ai_visibility: Record<string, unknown>;
    serp_data: Record<string, unknown>;
    entity_data: Record<string, unknown>;
    trend_data: Record<string, unknown>;
    regional_demand: Record<string, unknown>;
    source_urls: string[];
    created_at: string;
}

interface RadarV3Run {
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    opportunities_count: number;
    created_at: string;
}

// ============================================================================
// Helper Components
// ============================================================================

const INTENT_MAP: Record<string, { label: string; color: string }> = {
    informational: { label: 'Informacional', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    navigational: { label: 'Navegacional', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
    transactional: { label: 'Transacional', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
    commercial: { label: 'Comercial', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
};

const FUNNEL_MAP: Record<string, { label: string; color: string }> = {
    tofu: { label: 'Topo', color: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
    mofu: { label: 'Meio', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
    bofu: { label: 'Fundo', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
};

const CONTENT_TYPE_MAP: Record<string, string> = {
    blog_article: '📝 Artigo',
    pillar_page: '🏛️ Pilar',
    super_page: '⚡ Super Page',
    landing_page: '🎯 Landing',
    entity_page: '🔗 Entidade',
};

const COMPETITION_MAP: Record<string, { label: string; color: string }> = {
    low: { label: 'Baixa', color: 'text-green-600 dark:text-green-400' },
    medium: { label: 'Média', color: 'text-amber-600 dark:text-amber-400' },
    high: { label: 'Alta', color: 'text-red-600 dark:text-red-400' },
};

function ScoreBadge({ score }: { score: number }) {
    const color = score >= 80
        ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
        : score >= 60
            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
            : 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';

    return (
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold border ${color}`}>
            <Zap className="h-3.5 w-3.5" />
            {score}
        </div>
    );
}

// ============================================================================
// Maintenance Mode Fallback
// ============================================================================
function RadarMaintenanceFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 blur-3xl rounded-full" />
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                    <Radar className="h-16 w-16 text-violet-500 animate-pulse" />
                </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
                Radar em Manutenção
            </h1>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                O Radar de Inteligência está temporariamente desativado para upgrade do motor.
                A geração de artigos continua funcionando normalmente.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                <Shield className="h-4 w-4" />
                <span>Article Engine operando independentemente</span>
            </div>
        </div>
    );
}

// ============================================================================
// Opportunity Card
// ============================================================================
function OpportunityCard({
    opp,
    onGenerate,
}: {
    opp: RadarV3Opportunity;
    onGenerate: (opp: RadarV3Opportunity) => void;
}) {
    const intent = INTENT_MAP[opp.search_intent || ''] || INTENT_MAP.informational;
    const funnel = FUNNEL_MAP[opp.funnel_stage || ''] || FUNNEL_MAP.tofu;
    const competition = COMPETITION_MAP[opp.competition_level || 'medium'] || COMPETITION_MAP.medium;
    const contentType = CONTENT_TYPE_MAP[opp.content_type || 'blog_article'] || '📝 Artigo';
    const aiVisibility = opp.ai_visibility || {};
    const trendData = opp.trend_data || {};
    const helpfulContent = opp.helpful_content || {};

    return (
        <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden">
            {/* Score bar at top */}
            <div className="h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                style={{ opacity: opp.relevance_score / 100 }} />

            <CardContent className="pt-5 pb-4 space-y-4">
                {/* Header row: Score + Type + Funnel */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <ScoreBadge score={opp.relevance_score} />
                        <Badge variant="outline" className="text-xs">{contentType}</Badge>
                        <Badge className={`text-xs ${funnel.color}`}>{funnel.label}</Badge>
                    </div>
                    <Badge variant="outline" className={`text-xs border ${intent.color}`}>
                        {intent.label}
                    </Badge>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors">
                    {opp.title}
                </h3>

                {/* Why Now */}
                {opp.why_now && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                            {opp.why_now}
                        </p>
                    </div>
                )}

                {/* Keywords */}
                {opp.keywords && opp.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {opp.keywords.slice(0, 5).map((kw, i) => (
                            <span
                                key={i}
                                className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground"
                            >
                                {kw}
                            </span>
                        ))}
                        {opp.keywords.length > 5 && (
                            <span className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
                                +{opp.keywords.length - 5}
                            </span>
                        )}
                    </div>
                )}

                {/* Intelligence Signals */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* Volume */}
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <BarChart3 className="h-3 w-3" />
                        <span>{opp.estimated_volume ? `~${opp.estimated_volume}` : '-'}</span>
                    </div>
                    {/* Competition */}
                    <div className={`flex items-center gap-1 ${competition.color}`}>
                        <Target className="h-3 w-3" />
                        <span>{competition.label}</span>
                    </div>
                    {/* AI Visibility */}
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>
                            {(aiVisibility as any)?.citation_potential === 'high' ? '🟢 Citável'
                                : (aiVisibility as any)?.citation_potential === 'medium' ? '🟡 Médio'
                                    : '⚪ Baixo'}
                        </span>
                    </div>
                </div>

                {/* Trend momentum */}
                {(trendData as any)?.momentum && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>
                            Momentum: {(trendData as any).momentum === 'rising' ? '📈 Subindo'
                                : (trendData as any).momentum === 'stable' ? '➡️ Estável'
                                    : '📉 Caindo'}
                        </span>
                    </div>
                )}

                {/* EEAT & Helpful Content badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    {(opp.eeat_signals as any)?.expertise_angle && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <Shield className="h-3 w-3" />
                            EEAT
                        </div>
                    )}
                    {(helpfulContent as any)?.depth_required === 'deep' && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <Brain className="h-3 w-3" />
                            Deep Content
                        </div>
                    )}
                    {(aiVisibility as any)?.ai_overview_fit && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-3 w-3" />
                            AI Overview
                        </div>
                    )}
                </div>

                {/* Action */}
                <Button
                    size="sm"
                    className="w-full gap-2 mt-1"
                    onClick={() => onGenerate(opp)}
                    disabled={opp.status !== 'pending'}
                >
                    {opp.status === 'pending' ? (
                        <>
                            <ArrowUpRight className="h-4 w-4" />
                            Gerar Conteúdo
                        </>
                    ) : (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            {opp.status === 'generating' ? 'Gerando...' : opp.status === 'converted' ? 'Convertido' : opp.status}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Main Page Component
// ============================================================================
export default function RadarV3Page() {
    const isEnabled = useRadarV3Flag();
    const { blog, loading: blogLoading } = useBlog();
    const navigate = useNavigate();

    const [opportunities, setOpportunities] = useState<RadarV3Opportunity[]>([]);
    const [lastRun, setLastRun] = useState<RadarV3Run | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'tofu' | 'mofu' | 'bofu'>('all');

    // ─── Fetch data ──────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!blog?.id) return;
        setLoading(true);

        try {
            // Fetch opportunities (last 30 days, ordered by relevance)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: opps, error: oppsError } = await supabase
                .from('radar_v3_opportunities')
                .select('*')
                .eq('blog_id', blog.id)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('relevance_score', { ascending: false, nullsFirst: false })
                .limit(50);

            if (oppsError) {
                console.error('Error fetching V3 opportunities:', oppsError);
            } else {
                setOpportunities((opps || []) as unknown as RadarV3Opportunity[]);
            }

            // Fetch last run
            const { data: runs, error: runsError } = await supabase
                .from('radar_v3_runs')
                .select('id, status, started_at, finished_at, opportunities_count, created_at')
                .eq('blog_id', blog.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!runsError && runs && runs.length > 0) {
                setLastRun(runs[0] as unknown as RadarV3Run);
            }
        } catch (err) {
            console.error('Error in fetchRadarV3:', err);
        } finally {
            setLoading(false);
        }
    }, [blog?.id]);

    useEffect(() => {
        if (isEnabled) {
            fetchData();
        }
    }, [fetchData, isEnabled]);

    // ─── Refresh handler ─────────────────────────────────────────────
    const handleRefresh = async () => {
        if (!blog?.id) return;
        setRefreshing(true);

        try {
            const { data, error } = await supabase.functions.invoke('radar-v3-refresh', {
                body: { blogId: blog.id },
            });

            if (error) throw error;

            toast.success('Radar V3 atualizado!', {
                description: `${data?.opportunities_count || 0} novas oportunidades descobertas.`,
            });

            await fetchData();
        } catch (err) {
            console.error('Error refreshing Radar V3:', err);
            toast.error('Erro ao atualizar Radar', {
                description: err instanceof Error ? err.message : 'Tente novamente.',
            });
        } finally {
            setRefreshing(false);
        }
    };

    // ─── Generate from opportunity ───────────────────────────────────
    const handleGenerateFromOpp = (opp: RadarV3Opportunity) => {
        // Navigate to the article engine with pre-filled data
        navigate(`/client/articles/engine/new?keyword=${encodeURIComponent(opp.title)}&source=radar_v3&opp_id=${opp.id}`);
    };

    // ─── Guard: not enabled ──────────────────────────────────────────
    if (!isEnabled) {
        return <RadarMaintenanceFallback />;
    }

    if (blogLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!blog) {
        return <BlogRequiredState />;
    }

    // ─── Filter opportunities ────────────────────────────────────────
    const filtered = opportunities.filter((opp) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'high') return opp.relevance_score >= 75;
        return opp.funnel_stage === activeFilter;
    });

    const stats = {
        total: opportunities.length,
        highScore: opportunities.filter((o) => o.relevance_score >= 75).length,
        avgScore: opportunities.length > 0
            ? Math.round(opportunities.reduce((sum, o) => sum + o.relevance_score, 0) / opportunities.length)
            : 0,
        pending: opportunities.filter((o) => o.status === 'pending').length,
    };

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 shadow-sm">
                        <Radar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Radar V3</h1>
                        <p className="text-sm text-muted-foreground">
                            Intelligence Discovery Engine
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {lastRun && (
                        <div className="text-xs text-muted-foreground mr-2 hidden sm:block">
                            Última atualização:{' '}
                            {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        {refreshing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/10">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Oportunidades
                        </div>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/10">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            High Score (≥75)
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.highScore}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/10">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Score Médio
                        </div>
                        <p className="text-2xl font-bold">{stats.avgScore}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/10">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            Pendentes
                        </div>
                        <p className="text-2xl font-bold">{stats.pending}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Last Run Status */}
            {lastRun && lastRun.status === 'failed' && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        A última execução falhou. Clique em "Atualizar" para tentar novamente.
                    </AlertDescription>
                </Alert>
            )}

            {/* Filter tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                {[
                    { key: 'all' as const, label: 'Todas' },
                    { key: 'high' as const, label: 'High Score' },
                    { key: 'tofu' as const, label: 'Topo' },
                    { key: 'mofu' as const, label: 'Meio' },
                    { key: 'bofu' as const, label: 'Fundo' },
                ].map((filter, i) => (
                    <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className={`px-3 py-1.5 text-sm transition-colors ${i > 0 ? 'border-l border-border' : ''
                            } ${activeFilter === filter.key
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Content: Loading / Empty / List */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="p-4 rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 mb-4">
                            <Radar className="h-10 w-10 text-violet-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            {opportunities.length === 0
                                ? 'Nenhuma oportunidade descoberta ainda'
                                : 'Nenhuma oportunidade neste filtro'}
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                            {opportunities.length === 0
                                ? 'Clique em "Atualizar" para que o Radar V3 analise o mercado e descubra oportunidades de conteúdo.'
                                : 'Tente um filtro diferente ou atualize o Radar para gerar novas oportunidades.'}
                        </p>
                        {opportunities.length === 0 && (
                            <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
                                {refreshing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Analisando mercado...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Descobrir Oportunidades
                                    </>
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((opp) => (
                        <OpportunityCard
                            key={opp.id}
                            opp={opp}
                            onGenerate={handleGenerateFromOpp}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
