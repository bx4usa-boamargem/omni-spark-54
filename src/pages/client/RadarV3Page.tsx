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
// ============================================================================
// Scanning Animation Component
// ============================================================================
function ScanningCircle() {
    return (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-[ping_3s_infinite]" />
            <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-[pulse_2s_infinite]" />
            <div className="absolute inset-4 rounded-full border border-purple-500/20 rotate-45" />
            <div className="absolute inset-4 rounded-full border border-purple-500/20 -rotate-45" />
            <div className="relative p-8 rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 shadow-2xl">
                <Radar className="h-16 w-16 text-violet-500 animate-spin-slow" />
            </div>
            {/* Scanning beam */}
            <div className="absolute inset-0 rounded-full border-t-2 border-primary/40 animate-spin-slow" />
        </div>
    );
}

// ============================================================================
// Onboarding Card
// ============================================================================
function RadarOnboarding({ onStart, refreshing }: { onStart: () => void; refreshing: boolean }) {
    return (
        <Card className="border-2 border-dashed bg-gradient-to-b from-background to-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center px-6">
                <ScanningCircle />
                <h2 className="text-2xl font-bold mt-10 mb-3 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Ativar Inteligência de Descoberta
                </h2>
                <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed">
                    O Radar V3 analisa o Top 10 do Google em tempo real, mapeia intenções de busca e identifica lacunas semânticas para seus próximos artigos de alta performance.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-2xl">
                    {[
                        { title: 'Google SERPScan', desc: 'Lê os resultados atuais do Top 10' },
                        { title: 'Semantic Gap', desc: 'Acha o que ninguém escreveu' },
                        { title: 'PAA Extraction', desc: 'Extrai People Also Ask' }
                    ].map(f => (
                        <div key={f.title} className="p-3 rounded-xl bg-background border border-border/50 text-left">
                            <h4 className="text-xs font-bold text-violet-600 mb-1">{f.title}</h4>
                            <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
                        </div>
                    ))}
                </div>
                <Button
                    size="lg"
                    onClick={onStart}
                    disabled={refreshing}
                    className="gradient-primary px-10 h-14 rounded-full shadow-lg shadow-primary/25 font-bold text-lg transition-all hover:scale-105"
                >
                    {refreshing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    {refreshing ? 'Escaneando Mercado...' : 'Iniciar Primeira Varredura'}
                </Button>
            </CardContent>
        </Card>
    );
}

function RadarMaintenanceFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
            <div className="relative mb-8 p-6 rounded-2xl bg-muted/30 border border-border/50">
                <Radar className="h-16 w-16 text-muted-foreground/40" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Radar Offline</h1>
            <p className="text-muted-foreground text-center max-w-md mb-6 leading-relaxed">
                Esta funcionalidade está habilitada apenas para planos Enterprise ou via Feature Flag específica.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                <Shield className="h-4 w-4" />
                <span>Consulte seu administrador para ativar o Discovery Engine</span>
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

            if (error) {
                console.error('[RadarV3] Function error:', error);

                // Tratar erro 404 (Função não encontrada/não deployada)
                if (error.message?.includes('404') || error.message?.includes('not found')) {
                    toast.error('Edge Function não encontrada', {
                        description: 'A função "radar-v3-refresh" não está deployada no projeto Supabase. Execute: supabase functions deploy radar-v3-refresh',
                        duration: 6000,
                    });
                } else {
                    throw error;
                }
                return;
            }
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 shadow-sm">
                        <Radar className="h-6 w-6 text-violet-600 dark:text-violet-400 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Discovery Radar <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 ml-2 uppercase tracking-widest">v3.0</span></h1>
                        <p className="text-sm text-muted-foreground font-medium">Mapeamento de intenções e lacunas do Top 10 Google</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {lastRun && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            Último scan: {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                    )}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2 h-10 shadow-lg shadow-primary/20 font-bold px-5"
                    >
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {refreshing ? 'Escaneando...' : 'Atualizar Radar'}
                    </Button>
                </div>
            </div>

            {/* Stats - Somente se houver oportunidades */}
            {opportunities.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Oportunidades', value: stats.total, icon: <Search className="h-4 w-4" /> },
                        { label: 'High Potential', value: stats.high, icon: <Zap className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5' },
                        { label: 'Score Médio', value: stats.avg, icon: <Target className="h-4 w-4" /> },
                        { label: 'Em Aberto', value: stats.pending, icon: <Clock className="h-4 w-4" /> },
                    ].map((s) => (
                        <Card key={s.label} className={`border-none ${s.bg || 'bg-muted/30'} backdrop-blur-sm shadow-sm transition-all hover:scale-[1.02]`}>
                            <CardContent className="pt-4 pb-3 px-4">
                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground mb-1.5 tracking-tight">{s.icon}{s.label}</div>
                                <p className={`text-2xl font-black ${s.color || ''}`}>{s.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Failed run alert */}
            {lastRun?.status === 'failed' && (
                <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="font-medium text-destructive">A última varredura falhou devido a timeout ou erro de API. Tente novamente em alguns segundos.</AlertDescription>
                </Alert>
            )}

            {/* Content */}
            {loading && !refreshing ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <ScanningCircle />
                    <p className="text-sm font-bold text-muted-foreground animate-pulse">Carregando inteligência...</p>
                </div>
            ) : refreshing ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center animate-in zoom-in-95 duration-500">
                    <ScanningCircle />
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Escaneando o Top 10 Google</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Nossos agentes estão lendo cabeçalhos, metadados e People Also Ask para encontrar sua próxima brecha SEO.
                        </p>
                    </div>
                </div>
            ) : opportunities.length === 0 ? (
                <RadarOnboarding onStart={handleRefresh} refreshing={refreshing} />
            ) : (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex items-center justify-between">
                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50 w-fit">
                            {(['all', 'high'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-6 py-2 text-xs font-bold transition-all rounded-lg ${filter === f ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                        }`}
                                >
                                    {f === 'all' ? 'Ver Todas' : 'Apenas High Score'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((opp) => (
                            <OpportunityCard key={opp.id} opp={opp} onGenerate={handleGenerate} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
