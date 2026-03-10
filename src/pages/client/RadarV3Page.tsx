import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBlog } from '@/hooks/useBlog';
import { useRadarV3Flag } from '@/hooks/useRadarV3Flag';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Radar, Loader2, RefreshCw, Sparkles, Target,
    Zap, Shield, AlertTriangle, Clock, Search,
    ArrowUpRight, ChevronRight, Database, Building2, MapPin, CheckCircle2,
    Globe, Star, TrendingUp, Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BlogRequiredState } from '@/components/client/BlogRequiredState';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// Types — 3 Layer Architecture
// ============================================================================
interface TenantOpportunity {
    id: string;
    tenant_id: string;
    blog_id: string;
    service: string | null;
    keyword: string;
    title_suggestion: string;
    opportunity_score: number;
    local_context: Record<string, unknown>;
    why_now: string | null;
    status: string;
    source: string;
    shared_from: string | null;
    created_at: string;
}

interface MarketCacheInfo {
    id: string;
    segment: string;
    city: string;
    radar_status: string;
    expires_at: string;
    created_at: string;
    entities: string[];
    questions: string[];
    businesses_found?: number;
    // Layer 0 — Maps Intelligence
    geo_lat?: number | null;
    geo_lng?: number | null;
    maps_intelligence_status?: string;
    competitors?: unknown[];
    avg_rating?: number;
    avg_reviews?: number;
    neighborhoods?: string[];
    popular_queries?: string[];
    knowledge_entities?: unknown[];
    demand_signals?: Record<string, unknown>;
    content_gaps?: string[];
}

interface TenantRadarStatus {
    status: string;
    last_run_at: string | null;
    opportunities_count: number;
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
    semantic_gap: '🧠 Lacuna Semântica',
    serp_gap: '📊 SERP Gap',
    local_intent: '📍 Intenção Local',
    local_cluster: '🏘️ Cluster Local',
    paa: '❓ PAA',
    local_variant: '📍 Local',
    gemini: '✨ IA',
};

function SourceBadge({ source }: { source: string }) {
    const label = SOURCE_LABELS[source] || source;
    return (
        <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground whitespace-nowrap">
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
// Scanning Animation
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
            <div className="absolute inset-0 rounded-full border-t-2 border-primary/40 animate-spin-slow" />
        </div>
    );
}

// ============================================================================
// Layer 0 — Maps Intelligence Panel
// ============================================================================
function MapsIntelligencePanel({ cache }: { cache: MarketCacheInfo }) {
    const demandSig = cache.demand_signals || {};
    const competitors = Array.isArray(cache.competitors) ? cache.competitors : [];
    const neighborhoods = Array.isArray(cache.neighborhoods) ? cache.neighborhoods : [];
    const contentGaps = Array.isArray(cache.content_gaps) ? cache.content_gaps : [];
    const kgEntities = Array.isArray(cache.knowledge_entities) ? cache.knowledge_entities : [];
    const mapsReady = cache.maps_intelligence_status === 'ready';

    if (!mapsReady && competitors.length === 0) return null;

    return (
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">L0 · Google Maps Intelligence</span>
                {mapsReady && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-bold border border-green-500/20">READY</span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Concorrentes', value: competitors.length, icon: <Building2 className="h-3.5 w-3.5" />, color: 'text-violet-600 dark:text-violet-400' },
                    { label: 'Bairros', value: neighborhoods.length, icon: <MapPin className="h-3.5 w-3.5" />, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Rating Médio', value: cache.avg_rating ? cache.avg_rating.toFixed(1) : '—', icon: <Star className="h-3.5 w-3.5" />, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Gaps Detectados', value: contentGaps.length, icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-400' },
                ].map(s => (
                    <div key={s.label} className="p-2.5 rounded-lg bg-background/70 border border-border/50 text-center">
                        <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Demand Signals */}
            {Object.keys(demandSig).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {demandSig.saturation_level && (
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold border ${
                            demandSig.saturation_level === 'high' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                            demandSig.saturation_level === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            'bg-green-500/10 text-green-600 border-green-500/20'
                        }`}>Saturação: {String(demandSig.saturation_level).toUpperCase()}</span>
                    )}
                    {demandSig.entry_opportunity && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full font-bold border bg-green-500/10 text-green-600 border-green-500/20">✓ Oportunidade de Entrada</span>
                    )}
                    {demandSig.rating_gap && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">⚠ Rating Gap Detectado</span>
                    )}
                    {demandSig.cluster_market && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full font-bold border bg-violet-500/10 text-violet-600 border-violet-500/20">🏘 Cluster de Mercado</span>
                    )}
                </div>
            )}

            {/* Neighborhoods */}
            {neighborhoods.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Bairros Identificados</p>
                    <div className="flex flex-wrap gap-1.5">
                        {neighborhoods.slice(0, 8).map((nb) => (
                            <span key={String(nb)} className="px-2 py-0.5 text-[10px] rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/15 font-medium">
                                <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{String(nb)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Knowledge Graph Entities */}
            {kgEntities.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Brain className="h-3 w-3" />Entidades (Knowledge Graph)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {(kgEntities as Array<Record<string, string>>).slice(0, 6).map((e) => (
                            <span key={e.name} className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/15 font-medium">
                                {e.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Gaps */}
            {contentGaps.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />Gaps de Conteúdo Detectados
                    </p>
                    <ul className="space-y-1">
                        {contentGaps.slice(0, 5).map((gap, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                <span className="text-emerald-500 shrink-0 mt-0.5">→</span>
                                <span>{String(gap)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Geo coords */}
            {cache.geo_lat && cache.geo_lng && (
                <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    {cache.geo_lat.toFixed(4)}, {cache.geo_lng.toFixed(4)}
                </p>
            )}
        </div>
    );
}

// ============================================================================
// Layer Status Badge
// ============================================================================
function LayerStatusBar({
    tenantStatus,
    cacheInfo,
    cacheHit,
}: {
    tenantStatus: TenantRadarStatus | null;
    cacheInfo: MarketCacheInfo | null;
    cacheHit: boolean | null;
}) {
    if (!cacheInfo && !tenantStatus) return null;

    return (
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl bg-muted/30 border border-border/50">
            {/* Layer 0 */}
            <div className="flex items-center gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5 text-pink-500" />
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">L0 Maps</span>
                {cacheInfo?.maps_intelligence_status === 'ready' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-bold text-[10px] border border-green-500/20">READY</span>
                ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{cacheInfo ? 'READY' : 'N/A'}</span>
                )}
            </div>
            <div className="text-muted-foreground/30">·</div>

            {/* Layer 1 */}
            <div className="flex items-center gap-1.5 text-xs">
                <Database className="h-3.5 w-3.5 text-violet-500" />
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">L1 Market</span>
                {cacheInfo ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-bold text-[10px] border border-green-500/20">
                        {cacheInfo.segment}/{cacheInfo.city}
                    </span>
                ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">N/A</span>
                )}
            </div>
            <div className="text-muted-foreground/30">·</div>

            {/* Layer 2 */}
            <div className="flex items-center gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">L2 Cache</span>
                {cacheHit === null ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">—</span>
                ) : cacheHit ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-500/20">HIT</span>
                ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">MISS</span>
                )}
            </div>
            <div className="text-muted-foreground/30">·</div>

            {/* Layer 3 */}
            <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">L3 Tenant</span>
                {tenantStatus?.status === 'ready' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-bold text-[10px] border border-green-500/20">
                        <CheckCircle2 className="h-3 w-3" />READY
                    </span>
                ) : tenantStatus?.status === 'running' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold border border-amber-500/20">RUNNING</span>
                ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">PENDING</span>
                )}
            </div>

            {cacheInfo?.expires_at && (
                <>
                    <div className="text-muted-foreground/30">·</div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Cache expira {formatDistanceToNow(new Date(cacheInfo.expires_at), { addSuffix: true, locale: ptBR })}
                    </span>
                </>
            )}
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
                    Discovery Radar 3-Layer
                </h2>
                <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed">
                    O Radar analisa o mercado global por segmento + cidade (Layer 1), reutiliza intel entre subcontas (Layer 2) e personaliza oportunidades para seu negócio (Layer 3).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-2xl">
                    {[
                        { layer: 'L1', title: 'Global Market', desc: 'SERP + Places + Gemini por segmento/cidade' },
                        { layer: 'L2', title: 'Smart Cache', desc: 'Reutiliza análise 24h entre subcontas' },
                        { layer: 'L3', title: 'Tenant Custom', desc: 'Oportunidades personalizadas para você' },
                    ].map(f => (
                        <div key={f.layer} className="p-3 rounded-xl bg-background border border-border/50 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 border border-violet-500/20">{f.layer}</span>
                                <h4 className="text-xs font-bold text-violet-600">{f.title}</h4>
                            </div>
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
                    {refreshing ? 'Escaneando Mercado...' : 'Iniciar Varredura'}
                </Button>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Opportunity Card (Layer 3 output)
// ============================================================================
function OpportunityCard({
    opp,
    onGenerate,
}: {
    opp: TenantOpportunity;
    onGenerate: (opp: TenantOpportunity) => void;
}) {
    const city = String((opp.local_context as Record<string, unknown>)?.city || '');

    return (
        <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200">
            <div
                className="h-1 rounded-t-lg"
                style={{
                    background: `linear-gradient(90deg, hsl(${Math.round(opp.opportunity_score * 1.2)}, 70%, 50%) 0%, transparent 100%)`,
                    opacity: opp.opportunity_score / 100,
                }}
            />
            <CardContent className="pt-4 pb-3 space-y-3">
                {/* Score + Source */}
                <div className="flex items-center justify-between gap-2">
                    <ScoreBadge score={opp.opportunity_score} />
                    <SourceBadge source={opp.source} />
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {opp.title_suggestion}
                </h3>

                {/* Keyword + City */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{opp.keyword}</span>
                    </div>
                    {city && (
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                            <span className="text-[10px] text-muted-foreground/70 capitalize">{city}</span>
                        </div>
                    )}
                </div>

                {/* Service tag */}
                {opp.service && (
                    <span className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-medium">
                        {opp.service}
                    </span>
                )}

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

    const [opportunities, setOpportunities] = useState<TenantOpportunity[]>([]);
    const [tenantStatus, setTenantStatus] = useState<TenantRadarStatus | null>(null);
    const [cacheInfo, setCacheInfo] = useState<MarketCacheInfo | null>(null);
    const [cacheHit, setCacheHit] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'high'>('all');

    const fetchData = useCallback(async () => {
        if (!blog?.id) return;
        setLoading(true);
        try {
            const [{ data: opps }, { data: statusRows }] = await Promise.all([
                supabase
                    .from('tenant_radar_opportunities')
                    .select('*')
                    .eq('blog_id', blog.id)
                    .order('opportunity_score', { ascending: false })
                    .limit(50),
                supabase
                    .from('tenant_radar_status')
                    .select('status, last_run_at, opportunities_count, cache_id')
                    .eq('blog_id', blog.id)
                    .maybeSingle(),
            ]);

            setOpportunities((opps || []) as unknown as TenantOpportunity[]);

            if (statusRows) {
                setTenantStatus({
                    status: String(statusRows.status || 'pending'),
                    last_run_at: statusRows.last_run_at as string | null,
                    opportunities_count: Number(statusRows.opportunities_count || 0),
                });

                // Buscar info do cache se existir
                if (statusRows.cache_id) {
                    const { data: cache } = await supabase
                        .from('market_radar_cache')
                        .select('id, segment, city, radar_status, expires_at, created_at, entities, questions, geo_lat, geo_lng, maps_intelligence_status, competitors, avg_rating, avg_reviews, neighborhoods, popular_queries, knowledge_entities, demand_signals, content_gaps')
                        .eq('id', statusRows.cache_id)
                        .maybeSingle();
                    if (cache) setCacheInfo(cache as unknown as MarketCacheInfo);
                }
            }
        } catch (err) {
            console.error('Radar fetch error:', err);
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
        setCacheHit(null);
        try {
            // 1. Buscar segment (niche) e city do perfil de negócio
            const { data: profile } = await supabase
                .from('business_profile')
                .select('niche, city')
                .eq('blog_id', blog.id)
                .maybeSingle();

            const segment = profile?.niche || 'geral';
            const city = profile?.city || 'Brasil';

            // 2. Invocar o discovery-engine com os campos obrigatórios
            const { data, error } = await supabase.functions.invoke('discovery-engine', {
                body: { blogId: blog.id, segment, city, forceRefresh: true },
            });

            if (error) {
                console.error('[discovery-engine] error:', error);
                throw error;
            }

            const cacheHitFlag = Boolean(data?.cache_hit);
            setCacheHit(cacheHitFlag);

            toast.success(
                cacheHitFlag ? '⚡ Cache reutilizado!' : '🔍 Varredura completa!',
                {
                    description: `Segmento: ${segment} · ${city} · ${cacheHitFlag ? 'cache hit' : 'análise completa'}`,
                }
            );
            await fetchData();
        } catch (err) {
            toast.error('Erro ao executar Radar', {
                description: err instanceof Error ? err.message : 'Tente novamente.',
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleGenerate = (opp: TenantOpportunity) => {
        navigate(`/client/articles/engine/new?keyword=${encodeURIComponent(opp.keyword)}&source=radar_discovery&opp_id=${opp.id}`);
    };

    // Guards
    if (!isEnabled) return <RadarMaintenanceFallback />;
    if (blogLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
    if (!blog) return <BlogRequiredState />;

    const filtered = filter === 'high'
        ? opportunities.filter((o) => o.opportunity_score >= 70)
        : opportunities;

    const stats = {
        total: opportunities.length,
        high: opportunities.filter((o) => o.opportunity_score >= 70).length,
        avg: opportunities.length > 0
            ? Math.round(opportunities.reduce((s, o) => s + o.opportunity_score, 0) / opportunities.length)
            : 0,
        pending: opportunities.filter((o) => o.status === 'pending').length,
    };

    const isReady = tenantStatus?.status === 'ready';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 shadow-sm">
                        <Radar className="h-6 w-6 text-violet-600 dark:text-violet-400 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Discovery Radar
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 ml-2 uppercase tracking-widest">3-Layer</span>
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium">Inteligência de mercado multi-tenant por segmento + cidade</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {tenantStatus?.last_run_at && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            Último scan: {formatDistanceToNow(new Date(tenantStatus.last_run_at), { addSuffix: true, locale: ptBR })}
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

            {/* Layer Status Bar */}
            <LayerStatusBar tenantStatus={tenantStatus} cacheInfo={cacheInfo} cacheHit={cacheHit} />

            {/* Layer 0 — Maps Intelligence Panel */}
            {cacheInfo && <MapsIntelligencePanel cache={cacheInfo} />}

            {/* Bloqueio: tenant_radar_status != READY e há oportunidades 0 */}
            {!isReady && opportunities.length > 0 && (
                <Alert className="border-amber-500/20 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="font-medium text-amber-700 dark:text-amber-400">
                        Geração de conteúdo bloqueada — tenant_radar_status = {tenantStatus?.status?.toUpperCase() || 'PENDING'}. Execute o radar para liberar.
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats */}
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
                        <h3 className="text-xl font-bold">Executando Discovery Engine</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Layer 1: Global Market Radar → Layer 2: Cache Check → Layer 3: Personalização para seu negócio.
                        </p>
                        <div className="flex items-center justify-center gap-4 pt-2">
                            {['L1 Market', 'L2 Cache', 'L3 Tenant'].map((l) => (
                                <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {l}
                                </div>
                            ))}
                        </div>
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
                                    className={`px-6 py-2 text-xs font-bold transition-all rounded-lg ${filter === f ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                                >
                                    {f === 'all' ? 'Ver Todas' : 'Apenas High Score'}
                                </button>
                            ))}
                        </div>
                        {isReady && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">
                                <CheckCircle2 className="h-4 w-4" />
                                Geração liberada
                            </span>
                        )}
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
