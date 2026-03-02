import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBlog } from '@/hooks/useBlog';
import { useRadarV3Flag } from '@/hooks/useRadarV3Flag';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Radar, Loader2, RefreshCw, Sparkles, Target,
    Zap, Shield, AlertTriangle, Clock, Search,
    ArrowUpRight, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BlogRequiredState } from '@/components/client/BlogRequiredState';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// Types (minimal)
// ============================================================================
interface RadarOpportunity {
    id: string;
    keyword: string;
    title: string;
    confidence_score: number;
    why_now: string | null;
    status: string;
    source: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

interface RadarRun {
    id: string;
    status: string;
    opportunities_count: number;
    metadata: Record<string, unknown>;
    created_at: string;
}

// ============================================================================
// Score Badge
// ============================================================================
function ScoreBadge({ score }: { score: number }) {
    const color = score >= 75
        ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/25'
        : score >= 50
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25'
            : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25';

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
            <Zap className="h-3 w-3" />
            {score}
        </span>
    );
}

// ============================================================================
// Source Badge
// ============================================================================
const SOURCE_LABELS: Record<string, string> = {
    keyword_seed: '🌱 Seed',
    google_autocomplete: '🔍 Autocomplete',
    serp_title: '📊 SERP',
    local_variant: '📍 Local',
};

function SourceBadge({ source }: { source: string }) {
    const label = SOURCE_LABELS[source] || source;
    return (
        <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
            {label}
        </span>
    );
}

// ============================================================================
// Maintenance Fallback
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
            <h1 className="text-2xl font-bold text-foreground mb-3">Radar em Manutenção</h1>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                O Radar está temporariamente desativado. A geração de artigos continua normalmente.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                <Shield className="h-4 w-4" />
                <span>Article Engine operando independentemente</span>
            </div>
        </div>
    );
}

// ============================================================================
// Opportunity Card (minimal)
// ============================================================================
function OpportunityCard({
    opp,
    onGenerate,
}: {
    opp: RadarOpportunity;
    onGenerate: (opp: RadarOpportunity) => void;
}) {
    const sourceSignal = (opp.metadata as any)?.source_signal || '';

    return (
        <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200">
            <div
                className="h-1 rounded-t-lg"
                style={{
                    background: `linear-gradient(90deg, hsl(${Math.round(opp.confidence_score * 1.2)}, 70%, 50%) 0%, transparent 100%)`,
                    opacity: opp.confidence_score / 100,
                }}
            />
            <CardContent className="pt-4 pb-3 space-y-3">
                {/* Score + Source */}
                <div className="flex items-center justify-between gap-2">
                    <ScoreBadge score={opp.confidence_score} />
                    <SourceBadge source={sourceSignal} />
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {opp.title}
                </h3>

                {/* Keyword */}
                <div className="flex items-center gap-1.5">
                    <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{opp.keyword}</span>
                </div>

                {/* Why Now */}
                {opp.why_now && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed line-clamp-2">
                            {opp.why_now}
                        </p>
                    </div>
                )}

                {/* Action */}
                <Button
                    size="sm"
                    variant={opp.status === 'pending' ? 'default' : 'outline'}
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={() => onGenerate(opp)}
                    disabled={opp.status !== 'pending'}
                >
                    {opp.status === 'pending' ? (
                        <>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Gerar Artigo
                        </>
                    ) : (
                        <>
                            <ChevronRight className="h-3.5 w-3.5" />
                            {opp.status === 'generating' ? 'Gerando...' : opp.status === 'converted' ? 'Convertido' : opp.status}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Main Page
// ============================================================================
export default function RadarV3Page() {
    const isEnabled = useRadarV3Flag();
    const { blog, loading: blogLoading } = useBlog();
    const navigate = useNavigate();

    const [opportunities, setOpportunities] = useState<RadarOpportunity[]>([]);
    const [lastRun, setLastRun] = useState<RadarRun | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'high'>('all');

    const fetchData = useCallback(async () => {
        if (!blog?.id) return;
        setLoading(true);
        try {
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() - 30);

            const [{ data: opps }, { data: runs }] = await Promise.all([
                supabase
                    .from('radar_v3_opportunities')
                    .select('*')
                    .eq('blog_id', blog.id)
                    .gte('created_at', thirtyDays.toISOString())
                    .order('confidence_score', { ascending: false })
                    .limit(50),
                supabase
                    .from('radar_v3_runs')
                    .select('id, status, opportunities_count, metadata, created_at')
                    .eq('blog_id', blog.id)
                    .order('created_at', { ascending: false })
                    .limit(1),
            ]);

            setOpportunities((opps || []) as unknown as RadarOpportunity[]);
            if (runs && runs.length > 0) setLastRun(runs[0] as unknown as RadarRun);
        } catch (err) {
            console.error('Radar V3 fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [blog?.id]);

    useEffect(() => {
        if (isEnabled) fetchData();
    }, [fetchData, isEnabled]);

    const handleRefresh = async () => {
        if (!blog?.id) return;
        setRefreshing(true);
        try {
            const { data, error } = await supabase.functions.invoke('radar-v3-refresh', {
                body: { blogId: blog.id },
            });
            if (error) throw error;
            toast.success('Radar atualizado!', {
                description: `${data?.opportunities_count || 0} oportunidades em ${data?.elapsed_ms || '?'}ms`,
            });
            await fetchData();
        } catch (err) {
            toast.error('Erro ao atualizar Radar', {
                description: err instanceof Error ? err.message : 'Tente novamente.',
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleGenerate = (opp: RadarOpportunity) => {
        navigate(`/client/articles/engine/new?keyword=${encodeURIComponent(opp.keyword)}&source=radar_v3&opp_id=${opp.id}`);
    };

    // Guards
    if (!isEnabled) return <RadarMaintenanceFallback />;
    if (blogLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
    if (!blog) return <BlogRequiredState />;

    // Filter
    const filtered = filter === 'high'
        ? opportunities.filter((o) => o.confidence_score >= 70)
        : opportunities;

    const stats = {
        total: opportunities.length,
        high: opportunities.filter((o) => o.confidence_score >= 70).length,
        avg: opportunities.length > 0
            ? Math.round(opportunities.reduce((s, o) => s + o.confidence_score, 0) / opportunities.length)
            : 0,
        pending: opportunities.filter((o) => o.status === 'pending').length,
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-600/15">
                        <Radar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Radar V3</h1>
                        <p className="text-xs text-muted-foreground">Minimal Discovery Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {lastRun && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true, locale: ptBR })}
                            {lastRun.metadata && (lastRun.metadata as any).elapsed_ms
                                ? ` (${(lastRun.metadata as any).elapsed_ms}ms)`
                                : ''}
                        </span>
                    )}
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 h-8">
                        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Oportunidades', value: stats.total, icon: <Search className="h-3 w-3" /> },
                    { label: 'High (≥70)', value: stats.high, icon: <Zap className="h-3 w-3" />, color: 'text-green-600 dark:text-green-400' },
                    { label: 'Score Médio', value: stats.avg, icon: <Target className="h-3 w-3" /> },
                    { label: 'Pendentes', value: stats.pending, icon: <Clock className="h-3 w-3" /> },
                ].map((s) => (
                    <Card key={s.label} className="bg-muted/30">
                        <CardContent className="pt-3 pb-2 px-3">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">{s.icon}{s.label}</div>
                            <p className={`text-lg font-bold ${s.color || ''}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Failed run alert */}
            {lastRun?.status === 'failed' && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Última execução falhou. Clique em "Atualizar" para tentar novamente.</AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <div className="flex rounded-md border border-border overflow-hidden w-fit">
                {(['all', 'high'] as const).map((f, i) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 text-xs transition-colors ${i > 0 ? 'border-l border-border' : ''} ${filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            }`}
                    >
                        {f === 'all' ? 'Todas' : 'High Score'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-14">
                        <div className="p-3 rounded-full bg-violet-500/10 mb-3">
                            <Radar className="h-8 w-8 text-violet-500" />
                        </div>
                        <h3 className="text-base font-semibold mb-1">
                            {opportunities.length === 0 ? 'Nenhuma oportunidade descoberta' : 'Nenhuma neste filtro'}
                        </h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                            {opportunities.length === 0
                                ? 'Clique em "Atualizar" para o Radar descobrir oportunidades.'
                                : 'Mude o filtro ou atualize o Radar.'}
                        </p>
                        {opportunities.length === 0 && (
                            <Button onClick={handleRefresh} disabled={refreshing} size="sm" className="gap-1.5">
                                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Descobrir Oportunidades
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filtered.map((opp) => (
                        <OpportunityCard key={opp.id} opp={opp} onGenerate={handleGenerate} />
                    ))}
                </div>
            )}
        </div>
    );
}
