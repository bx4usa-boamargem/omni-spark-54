import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, Zap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RadarOpportunity {
    id: string;
    keyword: string;
    title: string;
    confidence_score: number;
    why_now: string | null;
    status: string;
    created_at: string;
    metadata: Record<string, unknown>;
}

export function DashboardRadarWidget({ blogId }: { blogId?: string }) {
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [opportunities, setOpportunities] = useState<RadarOpportunity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchOpportunities() {
            if (!blogId) return;
            setLoading(true);
            try {
                const thirtyDays = new Date();
                thirtyDays.setDate(thirtyDays.getDate() - 30);

                const { data, error } = await supabase
                    .from('radar_v3_opportunities')
                    .select('*')
                    .eq('blog_id', blogId)
                    .gte('created_at', thirtyDays.toISOString())
                    .order('confidence_score', { ascending: false })
                    .limit(10);

                if (!error && data && isMounted) {
                    setOpportunities(data as unknown as RadarOpportunity[]);
                }
            } catch (err) {
                console.error("Error fetching radar widget data:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchOpportunities();
        return () => { isMounted = false; };
    }, [blogId]);

    const scroll = (dir: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
        }
    };

    const handleGenerate = (opp: RadarOpportunity) => {
        navigate(`/client/articles/engine/new?keyword=${encodeURIComponent(opp.keyword)}&source=radar_v3&opp_id=${opp.id}`);
    };

    if (loading) {
        return (
            <div className="bg-card border rounded-2xl p-6 h-64 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin"></div>
                <p className="text-sm text-muted-foreground">Buscando oportunidades do seu Radar...</p>
            </div>
        );
    }

    if (opportunities.length === 0) {
        return (
            <div className="bg-card border rounded-2xl p-8 text-center space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                    <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Nenhuma oportunidade do Radar encontrada</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Ainda não temos dados rastreados. Acesse a aba Planejamento ou navegue até o Radar V3 para iniciar sua varredura local.
                </p>
                <Button onClick={() => navigate("/client/strategy?tab=radar")} variant="outline" className="mt-4">
                    Ir para o Radar
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-2xl overflow-hidden">
            {/* Widget Header */}
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            Nossa IA tem grandes oportunidades na sua região
                            <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                {opportunities.length} novas
                            </span>
                        </h3>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50"></div>
                    </div>
                    Atualizado recentemente
                </div>
            </div>

            {/* Scrolling List container */}
            <div className="relative group p-6">
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex flex-nowrap overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {opportunities.map((opp) => (
                        <div
                            key={opp.id}
                            className="shrink-0 w-[280px] sm:w-[320px] snap-center bg-background border rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-colors"
                        >
                            <div className="p-5 flex-1 flex flex-col gap-3">
                                {/* Score / Time */}
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/20">
                                        <Zap className="h-3 w-3" />
                                        Score {opp.confidence_score}
                                    </span>
                                </div>

                                <h4 className="font-bold text-[15px] leading-tight line-clamp-3 text-foreground">
                                    {opp.title}
                                </h4>

                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-auto">
                                    Pesquisado {formatDistanceToNow(new Date(opp.created_at), { locale: ptBR, addSuffix: true })}
                                </p>

                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {opp.keyword && (
                                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-md truncate max-w-full">
                                            {opp.keyword}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 pt-0">
                                <Button
                                    onClick={() => handleGenerate(opp)}
                                    className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white font-semibold gap-2 rounded-xl transition-all shadow-primary/20 hover:shadow-lg"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Criar Artigo
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="bg-amber-500/5 px-6 py-3 border-t border-amber-500/10 flex items-center justify-between">
                <p className="text-sm text-foreground/80 flex items-center gap-2">
                    <span className="text-amber-500">💡</span> Hoje você tem <strong className="text-foreground">+{opportunities.length} possibilidades</strong> de títulos que podem atrair leads.
                </p>
                <button
                    onClick={() => navigate('/client/strategy?tab=radar')}
                    className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                    Ver todas no Radar <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
