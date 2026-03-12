import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBlog } from '@/hooks/useBlog';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingUp,
  FileText,
  Zap,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Star,
  Target,
  Sparkles,
  ChevronRight,
  Eye,
  AlertCircle,
  DollarSign,
  BarChart2,
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ─── Paleta ─── */
const C = {
  purple: '#7C3AED',
  purpleSoft: 'rgba(124,58,237,0.10)',
  orange: '#F97316',
  orangeSoft: 'rgba(249,115,22,0.10)',
  blue: '#3B82F6',
  blueSoft: 'rgba(59,130,246,0.10)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16,185,129,0.10)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.10)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.10)',
};

/* ─── Tipos ─── */
interface Article {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
  seo_score?: number;
  view_count?: number;
  status?: string;
}

interface Lead {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  source?: string;
}

interface ROIMetrics {
  totalArticles: number;
  publishedArticles: number;
  totalLeads: number;
  leadsThisWeek: number;
  avgSeoScore: number;
  totalViews: number;
  totalEstimatedValue: number;
  articlesThisMonth: number;
}

/* ─── Components ─── */
function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color,
  colorSoft,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  color: string;
  colorSoft: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${colorSoft} 0%, transparent 60%)` }}
      />
      <div className="relative flex justify-between items-start mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: colorSoft }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white mb-0.5">{value}</p>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size / 2 - 6;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? C.emerald : score >= 40 ? C.amber : C.red;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s' }}
      />
    </svg>
  );
}

/* ─── Main ─── */
export default function ClientROIDashboard() {
  const navigate = useNavigate();
  const { blog } = useBlog();
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<ROIMetrics>({
    totalArticles: 0, publishedArticles: 0, totalLeads: 0,
    leadsThisWeek: 0, avgSeoScore: 0, totalViews: 0,
    totalEstimatedValue: 0, articlesThisMonth: 0,
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!blog?.id) return;
    setLoading(true);

    try {
      const weekAgo = subDays(new Date(), 7).toISOString();
      const monthAgo = subDays(new Date(), 30).toISOString();

      const [articlesRes, leadsRes, leadsWeekRes, profileRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id, title, slug, published_at, seo_score, view_count, status')
          .eq('blog_id', blog.id)
          .order('published_at', { ascending: false })
          .limit(20),
        supabase
          .from('leads')
          .select('id, name, email, created_at, source')
          .eq('blog_id', blog.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('blog_id', blog.id)
          .gte('created_at', weekAgo),
        supabase.from('profiles').select('full_name').eq('id', user?.id || '').single(),
      ]);

      if (!isMounted.current) return;

      const articles: Article[] = articlesRes.data || [];
      const leads: Lead[] = leadsRes.data || [];

      const published = articles.filter((a) => a.published_at);
      const avgSeo = published.length > 0
        ? Math.round(published.reduce((acc, a) => acc + (a.seo_score || 0), 0) / published.length)
        : 0;
      const views = articles.reduce((acc, a) => acc + (a.view_count || 0), 0);
      const thisMonth = articles.filter((a) => a.published_at && a.published_at >= monthAgo).length;

      // ROI estimado: R$ 250 por artigo publicado + R$ 50 por lead
      const estimatedValue = published.length * 250 + (leadsRes.count || 0) * 50;

      setMetrics({
        totalArticles: articles.length,
        publishedArticles: published.length,
        totalLeads: leadsRes.count || leads.length,
        leadsThisWeek: leadsWeekRes.count || 0,
        avgSeoScore: avgSeo,
        totalViews: views,
        totalEstimatedValue: estimatedValue,
        articlesThisMonth: thisMonth,
      });

      setRecentArticles(articles.slice(0, 5));
      setRecentLeads(leads.slice(0, 5));
      setUserName(profileRes.data?.full_name || user?.email?.split('@')[0] || 'Cliente');
    } catch (err) {
      console.error('[ClientROIDashboard] error:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [blog?.id, user?.id]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [fetchData]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite';

  const kpis = [
    {
      icon: FileText, label: 'Artigos Publicados', value: metrics.publishedArticles,
      sub: `${metrics.articlesThisMonth} este mês`, color: C.purple, colorSoft: C.purpleSoft,
    },
    {
      icon: MessageSquare, label: 'Leads Capturados', value: metrics.totalLeads,
      sub: `${metrics.leadsThisWeek} esta semana`, trend: metrics.leadsThisWeek > 0 ? 15 : 0,
      color: C.orange, colorSoft: C.orangeSoft,
    },
    {
      icon: Eye, label: 'Visualizações', value: metrics.totalViews.toLocaleString('pt-BR'),
      sub: 'total acumulado', color: C.blue, colorSoft: C.blueSoft,
    },
    {
      icon: DollarSign, label: 'ROI Estimado', value: `R$ ${metrics.totalEstimatedValue.toLocaleString('pt-BR')}`,
      sub: 'valor gerado pelo conteúdo', color: C.emerald, colorSoft: C.emeraldSoft,
    },
  ];

  return (
    <div className="space-y-8">

      {/* ── HEADER ── */}
      <header>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} style={{ color: C.purple }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.purple }}>ROI Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
              {greeting}, {userName.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {blog?.name ? (
                <>Acompanhe o desempenho de <span className="font-semibold" style={{ color: C.purple }}>{blog.name}</span></>
              ) : 'Carregando seu blog...'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/client/articles')}
              className="border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
            >
              <FileText size={14} className="mr-2" />
              Ver Artigos
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/client/articles/engine/new')}
              style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.orange})` }}
              className="text-white border-0 hover:opacity-90"
            >
              <Zap size={14} className="mr-2" />
              Gerar Artigo
            </Button>
          </div>
        </div>
      </header>

      {/* ── KPIs ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => <KPICard key={k.label} {...k} />)}
        </div>
      )}

      {/* ── SEO SCORE + ARTIGOS RECENTES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SEO Score Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-5 self-start w-full">
            <Target size={15} style={{ color: C.emerald }} />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">SEO Score Médio</span>
          </div>

          <div className="relative mb-3">
            <ScoreRing score={metrics.avgSeoScore} size={96} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{loading ? '…' : metrics.avgSeoScore}</span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            {metrics.avgSeoScore >= 70
              ? '🟢 Excelente! Seus artigos estão otimizados.'
              : metrics.avgSeoScore >= 40
              ? '🟡 Pode melhorar — revise os artigos com score baixo.'
              : '🔴 Atenção — otimize seus artigos urgente.'}
          </p>

          <div className="w-full grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Total', value: metrics.totalArticles },
              { label: 'Publicados', value: metrics.publishedArticles },
              { label: 'Rascunhos', value: metrics.totalArticles - metrics.publishedArticles },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                <p className="text-base font-black text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Artigos Recentes */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText size={15} style={{ color: C.purple }} />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Artigos Recentes</span>
            </div>
            <button
              onClick={() => navigate('/client/articles')}
              className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: C.purple }}
            >
              Ver todos <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : recentArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">Nenhum artigo ainda</p>
              <Button
                size="sm"
                onClick={() => navigate('/client/articles/engine/new')}
                className="mt-4"
                style={{ background: C.purple }}
              >
                <Zap size={12} className="mr-2" />
                Gerar primeiro artigo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentArticles.map((art) => {
                const score = art.seo_score || 0;
                const scoreColor = score >= 70 ? C.emerald : score >= 40 ? C.amber : C.red;
                return (
                  <div
                    key={art.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                    onClick={() => art.slug && navigate(`/client/articles/${art.id}`)}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                      style={{ background: art.published_at ? C.purpleSoft : 'rgba(0,0,0,0.04)', color: art.published_at ? C.purple : '#9CA3AF' }}
                    >
                      {art.published_at ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{art.title}</p>
                      <p className="text-xs text-gray-400">
                        {art.published_at
                          ? format(new Date(art.published_at), "dd 'de' MMM", { locale: ptBR })
                          : 'Rascunho'
                        }
                      </p>
                    </div>
                    {art.seo_score !== undefined && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-black" style={{ color: scoreColor }}>{score}</span>
                        <Star size={10} style={{ color: scoreColor }} />
                      </div>
                    )}
                    <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── LEADS + ROI TIMELINE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Leads Recentes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} style={{ color: C.orange }} />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Leads Recentes</span>
            </div>
            <button
              onClick={() => navigate('/client/leads')}
              className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: C.orange }}
            >
              Ver todos <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">Nenhum lead ainda</p>
              <p className="text-xs text-gray-400 mt-1">Os leads aparecerão conforme seus artigos gerarem tráfego</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: C.orangeSoft, color: C.orange }}>
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.email || lead.source || 'contato'}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {format(new Date(lead.created_at), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROI Estimado Timeline */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={15} style={{ color: C.blue }} />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Valor Gerado pelo Conteúdo</span>
          </div>

          {/* ROI Breakdown */}
          <div className="space-y-4">
            {[
              {
                label: 'Artigos publicados × R$ 250',
                value: metrics.publishedArticles * 250,
                sub: `${metrics.publishedArticles} artigos`,
                color: C.purple,
                bg: C.purpleSoft,
              },
              {
                label: 'Leads capturados × R$ 50',
                value: metrics.totalLeads * 50,
                sub: `${metrics.totalLeads} leads`,
                color: C.orange,
                bg: C.orangeSoft,
              },
              {
                label: 'Visibilidade orgânica',
                value: metrics.totalViews * 2,
                sub: `${metrics.totalViews} views × R$ 2 CPM`,
                color: C.blue,
                bg: C.blueSoft,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-black" style={{ color: item.color }}>
                    R$ {item.value.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: item.bg }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (item.value / Math.max(metrics.totalEstimatedValue, 1)) * 100)}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Estimado</span>
              <span className="text-lg font-black" style={{ color: C.emerald }}>
                R$ {metrics.totalEstimatedValue.toLocaleString('pt-BR')}
              </span>
            </div>

            <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              💡 Estimativa baseada em benchmarks de conteúdo B2B brasileiro. Valor real pode variar com nicho e estratégia de SEO.
            </p>
          </div>
        </div>
      </div>

      {/* ── PRÓXIMOS PASSOS ── */}
      <div className="bg-gradient-to-br from-purple-50 to-orange-50 dark:from-purple-900/20 dark:to-orange-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} style={{ color: C.purple }} />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Próximos Passos para Maximizar ROI</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              emoji: '🚀',
              title: 'Gerar 3 artigos/semana',
              desc: 'Mantenha regularidade para algoritmo',
              action: () => navigate('/client/articles/engine/new'),
              cta: 'Criar Artigo',
            },
            {
              emoji: '🎯',
              title: 'Revisar SEO baixo',
              desc: 'Artigos < 50 pontos precisam atenção',
              action: () => navigate('/client/articles'),
              cta: 'Ver Artigos',
            },
            {
              emoji: '💬',
              title: 'Ativar formulário',
              desc: 'Capture leads direto do seu portal',
              action: () => navigate('/client/portal'),
              cta: 'Configurar',
            },
          ].map((step) => (
            <div key={step.title} className="bg-white dark:bg-gray-900 rounded-xl p-4 flex flex-col gap-2">
              <span className="text-xl">{step.emoji}</span>
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">{step.title}</h4>
              <p className="text-xs text-gray-500 flex-1">{step.desc}</p>
              <button
                onClick={step.action}
                className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: C.purple }}
              >
                {step.cta} <ChevronRight size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
