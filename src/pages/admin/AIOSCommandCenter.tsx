import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  TrendingUp,
  Users,
  FileText,
  Zap,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart2,
  Brain,
  Cpu,
  RefreshCcw,
  ChevronRight,
  Layers,
  Star,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Sparkles,
  Shield,
  Database,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ─── Paleta OmniSeen ─── */
const C = {
  purple: '#7C3AED',
  purpleSoft: 'rgba(124,58,237,0.12)',
  purpleGlow: 'rgba(124,58,237,0.25)',
  orange: '#F97316',
  orangeSoft: 'rgba(249,115,22,0.12)',
  blue: '#3B82F6',
  blueSoft: 'rgba(59,130,246,0.12)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16,185,129,0.12)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.12)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.12)',
};

/* ─── Tipos ─── */
interface PlatformStats {
  totalBlogs: number;
  totalArticles: number;
  totalUsers: number;
  articlesThisWeek: number;
  articlesLastWeek: number;
  activeBlogs: number;
  avgSeoScore: number;
  totalLeads: number;
}

interface RecentBlog {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  articles_count?: number;
}

interface GenerationRun {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  total_articles?: number;
  blog?: { name: string };
}

/* ─── Widgets de Métrica ─── */
function MetricCard({
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
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Glow no hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${colorSoft} 0%, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</span>
          <span className="text-3xl font-black" style={{ color }}>{value}</span>
          {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: colorSoft }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend).toFixed(0)}% vs semana anterior
        </div>
      )}
    </div>
  );
}

/* ─── Status Pill ─── */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: 'Concluído', color: C.emerald, bg: C.emeraldSoft },
    processing: { label: 'Em Execução', color: C.blue, bg: C.blueSoft },
    pending: { label: 'Pendente', color: C.amber, bg: C.amberSoft },
    failed: { label: 'Falhou', color: C.red, bg: C.redSoft },
  };
  const s = map[status] || map.pending;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

/* ─── ProgressBar ─── */
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  );
}

/* ─── Componente Principal ─── */
export function AIOSCommandCenter() {
  const [stats, setStats] = useState<PlatformStats>({
    totalBlogs: 0,
    totalArticles: 0,
    totalUsers: 0,
    articlesThisWeek: 0,
    articlesLastWeek: 0,
    activeBlogs: 0,
    avgSeoScore: 0,
    totalLeads: 0,
  });
  const [recentBlogs, setRecentBlogs] = useState<RecentBlog[]>([]);
  const [recentRuns, setRecentRuns] = useState<GenerationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [engineOnline, setEngineOnline] = useState(true);

  const fetchPlatformData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weekAgo = subDays(now, 7).toISOString();
      const twoWeeksAgo = subDays(now, 14).toISOString();

      const [
        blogsRes,
        articlesRes,
        profilesRes,
        thisWeekRes,
        lastWeekRes,
        runRes,
      ] = await Promise.all([
        supabase.from('blogs').select('id, name, slug, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('articles').select('id, seo_score', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('articles').select('id', { count: 'exact' }).gte('created_at', weekAgo),
        supabase.from('articles').select('id', { count: 'exact' }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
        supabase.from('generation_runs').select('id, status, created_at, completed_at, total_articles').order('created_at', { ascending: false }).limit(8),
      ]);

      const articles = articlesRes.data || [];
      const avgSeo = articles.length > 0
        ? Math.round(articles.reduce((acc, a) => acc + (a.seo_score || 0), 0) / articles.length)
        : 0;

      const blogs = blogsRes.data || [];

      setStats({
        totalBlogs: blogsRes.count || blogs.length,
        totalArticles: articlesRes.count || 0,
        totalUsers: profilesRes.count || 0,
        articlesThisWeek: thisWeekRes.count || 0,
        articlesLastWeek: lastWeekRes.count || 0,
        activeBlogs: blogs.length,
        avgSeoScore: avgSeo,
        totalLeads: 0,
      });

      setRecentBlogs(blogs as RecentBlog[]);
      setRecentRuns((runRes.data || []) as GenerationRun[]);
      setLastFetched(new Date());
    } catch (err) {
      console.error('[AIOSCommandCenter] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformData();
    const interval = setInterval(fetchPlatformData, 60_000); // auto-refresh 60s
    return () => clearInterval(interval);
  }, [fetchPlatformData]);

  const articleTrend =
    stats.articlesLastWeek > 0
      ? ((stats.articlesThisWeek - stats.articlesLastWeek) / stats.articlesLastWeek) * 100
      : 0;

  const topMetrics = [
    {
      icon: Layers,
      label: 'Blogs Ativos',
      value: stats.totalBlogs,
      sub: 'tenants na plataforma',
      color: C.purple,
      colorSoft: C.purpleSoft,
    },
    {
      icon: FileText,
      label: 'Artigos Gerados',
      value: stats.totalArticles.toLocaleString('pt-BR'),
      sub: `${stats.articlesThisWeek} esta semana`,
      trend: articleTrend,
      color: C.orange,
      colorSoft: C.orangeSoft,
    },
    {
      icon: Users,
      label: 'Usuários Totais',
      value: stats.totalUsers,
      sub: 'perfis registrados',
      color: C.blue,
      colorSoft: C.blueSoft,
    },
    {
      icon: Star,
      label: 'SEO Score Médio',
      value: `${stats.avgSeoScore}`,
      sub: 'pontuação média da plataforma',
      color: stats.avgSeoScore >= 70 ? C.emerald : C.amber,
      colorSoft: stats.avgSeoScore >= 70 ? C.emeraldSoft : C.amberSoft,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0F0A1E 0%, #12112A 50%, #0D1225 100%)' }}>
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 px-6 md:px-10 py-4" style={{ background: 'rgba(15,10,30,0.9)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo + título */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.orange})` }}>
                  <Brain size={20} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: C.emerald }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight">AIOS Command Center</h1>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.emerald }} />
                  <span className="text-xs text-gray-400">Motor AI {engineOnline ? 'Online' : 'Offline'}</span>
                  {lastFetched && (
                    <span className="text-xs text-gray-600">
                      · atualizado {format(lastFetched, "HH:mm:ss")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle engine */}
            <button
              onClick={() => setEngineOnline(!engineOnline)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200"
              style={{
                borderColor: engineOnline ? C.emerald : C.red,
                color: engineOnline ? C.emerald : C.red,
                background: engineOnline ? C.emeraldSoft : C.redSoft,
              }}
            >
              {engineOnline ? <><Shield size={12} /> Engine On</> : <><AlertTriangle size={12} /> Engine Off</>}
            </button>

            <button
              onClick={fetchPlatformData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-all"
            >
              <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">

        {/* ── MÉTRICAS TOPO ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Visão Geral da Plataforma</h2>
            <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs">
              Tempo Real
            </Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {topMetrics.map((m) => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>
          )}
        </section>

        {/* ── PIPELINE STATUS + BLOGS RECENTES ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Pipeline de Geração (3 cols) */}
          <section className="lg:col-span-3 bg-white/5 backdrop-blur rounded-2xl border border-white/8 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Cpu size={16} style={{ color: C.purple }} />
                <h2 className="text-sm font-bold text-white">Pipeline de Geração</h2>
              </div>
              <button
                onClick={() => window.location.href = '/admin/workflows'}
                className="text-xs text-gray-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                Ver motor <ChevronRight size={12} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Zap size={32} className="mb-3" style={{ color: C.purple, opacity: 0.4 }} />
                <p className="text-sm text-gray-500">Nenhuma geração encontrada</p>
                <p className="text-xs text-gray-600 mt-1">O histórico aparecerá aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.purpleSoft }}>
                        <Zap size={14} style={{ color: C.purple }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          Run #{run.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(run.created_at), "dd/MM · HH:mm", { locale: ptBR })}
                          {run.total_articles ? ` · ${run.total_articles} artigos` : ''}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={run.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Blogs Recentes (2 cols) */}
          <section className="lg:col-span-2 bg-white/5 backdrop-blur rounded-2xl border border-white/8 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Globe size={16} style={{ color: C.orange }} />
                <h2 className="text-sm font-bold text-white">Blogs Recentes</h2>
              </div>
              <button
                onClick={() => window.location.href = '/admin'}
                className="text-xs text-gray-500 hover:text-orange-400 flex items-center gap-1 transition-colors"
              >
                Ver todos <ChevronRight size={12} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : recentBlogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe size={32} className="mb-3" style={{ color: C.orange, opacity: 0.4 }} />
                <p className="text-sm text-gray-500">Nenhum blog cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBlogs.slice(0, 8).map((blog) => (
                  <div
                    key={blog.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black" style={{ background: C.orangeSoft, color: C.orange }}>
                        {blog.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-200 truncate">{blog.name}</p>
                        <p className="text-xs text-gray-600 truncate">{blog.slug}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0 ml-2" title={format(new Date(blog.created_at), "dd/MM/yyyy")}>
                      {format(new Date(blog.created_at), "dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── SEO HEALTH + PRODUÇÃO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SEO Health */}
          <section className="bg-white/5 backdrop-blur rounded-2xl border border-white/8 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target size={16} style={{ color: C.emerald }} />
              <h2 className="text-sm font-bold text-white">SEO Health da Plataforma</h2>
            </div>

            {/* Score gauge simples */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={stats.avgSeoScore >= 70 ? C.emerald : stats.avgSeoScore >= 40 ? C.amber : C.red}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(stats.avgSeoScore / 100) * 314.16} 314.16`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{loading ? '…' : stats.avgSeoScore}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Score médio dos artigos</p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Score < 40 (crítico)', value: 8, color: C.red },
                { label: 'Score 40–69 (médio)', value: 35, color: C.amber },
                { label: 'Score 70+ (bom)', value: 57, color: C.emerald },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>{item.value}%</span>
                  </div>
                  <ProgressBar value={item.value} color={item.color} />
                </div>
              ))}
            </div>
          </section>

          {/* Volume de Produção */}
          <section className="lg:col-span-2 bg-white/5 backdrop-blur rounded-2xl border border-white/8 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} style={{ color: C.blue }} />
                <h2 className="text-sm font-bold text-white">Volume de Produção (últimos 14 dias)</h2>
              </div>
            </div>

            {/* Mini chart de barras simulado */}
            <div className="flex items-end gap-1 h-32 mb-4">
              {[3,5,2,8,6,10,4,7,9,5,11,8,stats.articlesThisWeek || 6,stats.articlesLastWeek || 4].reverse().map((v, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all duration-300" style={{
                  height: `${Math.max(8, (v / 12) * 100)}%`,
                  background: i < 7
                    ? `linear-gradient(to top, ${C.purple}, ${C.orange})`
                    : 'rgba(255,255,255,0.1)'
                }} />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white">{stats.articlesThisWeek}</p>
                <p className="text-xs text-gray-500 mt-0.5">Esta semana</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white">{stats.articlesLastWeek}</p>
                <p className="text-xs text-gray-500 mt-0.5">Semana passada</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className={`text-2xl font-black ${articleTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {articleTrend > 0 ? '+' : ''}{articleTrend.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Variação</p>
              </div>
            </div>
          </section>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Eye, label: 'Admin Panel', desc: 'Gestão de tenants', path: '/admin', color: C.purple, bg: C.purpleSoft },
            { icon: Activity, label: 'Motor de Tracking', desc: 'Workflows em tempo real', path: '/admin/workflows', color: C.orange, bg: C.orangeSoft },
            { icon: Sparkles, label: 'Geração de Conteúdo', desc: 'Novo artigo IA', path: '/client/articles/engine/new', color: C.blue, bg: C.blueSoft },
            { icon: Database, label: 'Validação de Dados', desc: 'Quality assurance', path: '/admin/validation', color: C.emerald, bg: C.emeraldSoft },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => window.location.href = action.path}
              className="relative flex flex-col items-start gap-2 p-4 rounded-2xl border border-white/5 hover:border-white/15 transition-all duration-200 group text-left overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(ellipse at bottom right, ${action.bg} 0%, transparent 70%)` }}
              />
              <div className="p-2.5 rounded-xl" style={{ background: action.bg }}>
                <action.icon size={16} style={{ color: action.color }} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{action.label}</p>
                <p className="text-xs text-gray-500">{action.desc}</p>
              </div>
              <ArrowUpRight size={12} className="absolute top-3 right-3 text-gray-600 group-hover:text-gray-300 transition-colors" />
            </button>
          ))}
        </section>

        {/* ── FOOTER ── */}
        <footer className="text-center py-4 text-xs text-gray-700">
          OmniSeen AIOS Command Center · Plataforma de Conteúdo AI · {format(new Date(), 'yyyy')}
        </footer>
      </div>
    </div>
  );
}

export default AIOSCommandCenter;
