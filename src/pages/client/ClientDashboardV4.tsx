import { useEffect, useState, useRef } from 'react';
import { useBlog } from '@/hooks/useBlog';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  totalArticles: number;
  publishedThisMonth: number;
  organicScore: number;
  queueCount: number;
}

interface QueueItem {
  id: string;
  keyword: string;
  title?: string;
  status: string;
  scheduled_date?: string;
  seo_score?: number;
  created_at: string;
}

interface ActivityItem {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface BusinessProfile {
  business_name?: string;
  city?: string;
  city_state?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h ${mins % 60}min`;
  return `há ${Math.floor(hrs / 24)} dias`;
}

function fmtDate(dateStr?: string): { day: string; mon: string } {
  if (!dateStr) return { day: '--', mon: '---' };
  const d = new Date(dateStr);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return { day: String(d.getDate()).padStart(2, '0'), mon: months[d.getMonth()] };
}

function statusLabel(status: string): { text: string; cls: string } {
  if (status === 'review')    return { text: 'Revisão',  cls: 'sched-status-review' };
  if (status === 'scheduled') return { text: 'Agendado', cls: 'sched-status-sched' };
  if (status === 'draft')     return { text: 'Rascunho', cls: 'sched-status-draft' };
  if (status === 'done' || status === 'published') return { text: 'Publicado', cls: 'sched-status-done' };
  return { text: status,  cls: 'sched-status-draft' };
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (displayed / 100) * circ;

  useEffect(() => {
    let start = 0;
    const dur = 1400;
    const startTime = performance.now();
    const raf = (ts: number) => {
      const prog = Math.min((ts - startTime) / dur, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setDisplayed(Math.round(start + (score - start) * ease));
      if (prog < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [score]);

  return (
    <div className="v4-score-ring">
      <svg viewBox="0 0 120 120" width={120} height={120}>
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D4FF"/>
            <stop offset="100%" stopColor="#0066FF"/>
          </linearGradient>
        </defs>
        <circle className="v4-ring-bg" cx={60} cy={60} r={r}/>
        <circle
          className="v4-ring-fill"
          cx={60} cy={60} r={r}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
        />
      </svg>
      <div className="v4-score-center">
        <div className="v4-score-num">{displayed}</div>
        <div className="v4-score-label">Score</div>
      </div>
    </div>
  );
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

function KpiBar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="v4-kpi-bar-bg">
      <div
        className="v4-kpi-bar"
        style={{ width: `${w}%`, background: color, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientDashboardV4() {
  const { blog } = useBlog();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<BusinessProfile>({});
  const [stats, setStats] = useState<DashStats>({
    totalArticles: 0, publishedThisMonth: 0, organicScore: 0, queueCount: 0,
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!blog?.id) return;
    const bid = blog.id;

    Promise.all([
      // Business profile
      supabase.from('business_profile').select('business_name,city,city_state').eq('blog_id', bid).maybeSingle(),
      // Total articles published
      supabase.from('articles').select('id, created_at', { count: 'exact' }).eq('blog_id', bid).eq('status', 'published'),
      // Monthly articles (current month)
      supabase.from('articles').select('id', { count: 'exact' })
        .eq('blog_id', bid).eq('status', 'published')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      // Queue / upcoming articles (cast via any — table not yet in generated types)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('article_queue').select('id,keyword,title,status,scheduled_date,seo_score,created_at')
        .eq('blog_id', bid).order('scheduled_date', { ascending: true }).limit(5),
      // Activity (blog_automation events)
      supabase.from('blog_automation').select('id,event_type,payload,created_at')
        .eq('blog_id', bid).order('created_at', { ascending: false }).limit(5),
    ]).then(([profRes, totRes, monRes, qRes, actRes]) => {
      if (profRes.data) setProfile(profRes.data);

      const total = (totRes.count ?? 0) + (totRes.data?.length ?? 0);
      const monthly = monRes.count ?? 0;
      const queueCount = (qRes.data as unknown as QueueItem[])?.length ?? 0;
      // Derive a rough organic score from article count and SEO avg
      const queueData = (qRes.data as unknown as QueueItem[]) || [];
      const avgSeo = queueData.reduce((s: number, q: QueueItem) => s + (q.seo_score || 0), 0);
      const seoCnt = queueData.filter((q: QueueItem) => q.seo_score).length;
      const seoAvg = seoCnt > 0 ? avgSeo / seoCnt : 70;
      const score = Math.min(99, Math.round((total / 50) * 40 + seoAvg * 0.6));

      setStats({ totalArticles: total, publishedThisMonth: monthly, organicScore: score || 0, queueCount });
      setQueue(queueData);
      setActivity((actRes.data as unknown as ActivityItem[]) || []);
      setLoading(false);
    });
  }, [blog?.id]);

  // ── Greeting ────────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const companyName = profile?.business_name || blog?.name || 'sua empresa';
  const cityLabel = profile?.city_state || profile?.city || '';

  const articlePct = stats.totalArticles > 0 ? Math.min(100, Math.round((stats.totalArticles / 50) * 100)) : 0;
  const scoreKpi = stats.organicScore;

  // ── Activity color ───────────────────────────────────────────────────────────
  function activityColor(evt: string) {
    if (evt?.includes('article') || evt?.includes('seo')) return 'var(--v4-green)';
    if (evt?.includes('keyword') || evt?.includes('radar')) return 'var(--v4-cyan)';
    if (evt?.includes('alert') || evt?.includes('gmb') || evt?.includes('review')) return 'var(--v4-orange)';
    return 'var(--v4-cyan)';
  }

  function activityText(item: ActivityItem): string {
    const p = item.payload || {};
    const title = (p as Record<string, string>).title || (p as Record<string, string>).keyword || '';
    const agent = (p as Record<string, string>).agent || item.event_type;
    if (item.event_type?.includes('article_published')) return `✅ ${agent}: artigo publicado "${title}"`;
    if (item.event_type?.includes('article_generated')) return `✍️ ${agent}: conteúdo gerado "${title}"`;
    if (item.event_type?.includes('keyword')) return `🔍 ${agent}: ${title || 'oportunidade mapeada'}`;
    if (item.event_type?.includes('rank')) return `📈 ${agent}: ranking atualizado`;
    return `${agent}: ${title || item.event_type}`;
  }

  // ── Upcoming articles (from queue) ───────────────────────────────────────────
  const upcoming = queue.filter(q => q.status !== 'done' && q.status !== 'published').slice(0, 3);

  return (
    <div className={`v4-root ${darkMode ? 'v4-dark' : 'v4-light'}`}>
      <style>{V4_STYLES}</style>

      {/* TOPBAR */}
      <header className="v4-topbar">
        <div className="v4-topbar-greeting">
          {greeting}, <span>{companyName.split(' ')[0]}</span>
          {cityLabel && <span className="v4-topbar-city"> · {cityLabel}</span>}
          <span className="v4-topbar-date">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="v4-topbar-actions">
          <button className="v4-theme-toggle" onClick={() => setDarkMode(d => !d)} title="Alternar tema">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div className="v4-icon-btn" title="Notificações">
            🔔<div className="v4-notif-dot"/>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="v4-content">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div className="v4-hero">
          <ScoreRing score={loading ? 0 : scoreKpi} />
          <div className="v4-hero-info">
            <div className="v4-hero-title">
              Sua presença digital está <span>{scoreKpi >= 70 ? 'crescendo' : scoreKpi >= 40 ? 'evoluindo' : 'começando'}</span>
            </div>
            <div className="v4-hero-sub">
              {loading
                ? 'Carregando dados...'
                : `Você tem ${stats.totalArticles} artigos publicados. Os agentes trabalham 24/7 para crescer sua visibilidade no Google.`
              }
            </div>
            <div className="v4-hero-stats">
              <div className="v4-hero-stat v4-hero-stat-active">
                <div className="v4-hero-stat-val">{stats.totalArticles} <span>↑{stats.publishedThisMonth}</span></div>
                <div className="v4-hero-stat-lbl">Artigos</div>
              </div>
              <div className="v4-hero-stat">
                <div className="v4-hero-stat-val">{scoreKpi}<span style={{fontSize:'0.6em'}}>/100</span></div>
                <div className="v4-hero-stat-lbl">Score SEO</div>
              </div>
              <div className="v4-hero-stat">
                <div className="v4-hero-stat-val">{stats.queueCount} <span>↑</span></div>
                <div className="v4-hero-stat-lbl">Na fila</div>
              </div>
            </div>
            <div className="v4-hero-actions">
              <button className="v4-btn-primary" onClick={() => navigate('/client/radar')}>✦ Ver Oportunidades</button>
              <button className="v4-btn-secondary" onClick={() => navigate('/client/content')}>+ Criar Artigo</button>
              <button className="v4-btn-secondary" onClick={() => navigate('/client/analytics')}>📊 Ver Performance</button>
            </div>
          </div>
        </div>

        {/* ── KPI GRID ─────────────────────────────────────────────────────── */}
        <div className="v4-kpi-grid">
          {/* Artigos publicados */}
          <div className="v4-kpi-card">
            <div className="v4-kpi-top">
              <div className="v4-kpi-icon" style={{background:'var(--v4-cyan-dim)'}}>📝</div>
              <div className="v4-kpi-trend v4-trend-up">▲ +{stats.publishedThisMonth} este mês</div>
            </div>
            <div>
              <div className="v4-kpi-val">{loading ? '—' : stats.totalArticles}</div>
              <div className="v4-kpi-lbl">Artigos publicados</div>
            </div>
            <div>
              <KpiBar pct={articlePct} color="linear-gradient(90deg,var(--v4-cyan),#0066FF)"/>
              <div className="v4-kpi-hint">Meta do plano: 50 artigos</div>
            </div>
          </div>

          {/* Score SEO */}
          <div className="v4-kpi-card">
            <div className="v4-kpi-top">
              <div className="v4-kpi-icon" style={{background:'var(--v4-green-dim)'}}>📍</div>
              <div className={`v4-kpi-trend ${scoreKpi >= 70 ? 'v4-trend-up' : 'v4-trend-flat'}`}>
                {scoreKpi >= 70 ? '▲ Otimizado' : '— Em progresso'}
              </div>
            </div>
            <div>
              <div className="v4-kpi-val">{loading ? '—' : scoreKpi}<sup style={{fontSize:'0.4em',verticalAlign:'super'}}>/100</sup></div>
              <div className="v4-kpi-lbl">Score de presença</div>
            </div>
            <div>
              <KpiBar pct={scoreKpi} color="linear-gradient(90deg,var(--v4-green),#00A070)"/>
              <div className="v4-kpi-hint">Baseado em artigos e qualidade SEO</div>
            </div>
          </div>

          {/* Artigos na fila */}
          <div className="v4-kpi-card">
            <div className="v4-kpi-top">
              <div className="v4-kpi-icon" style={{background:'var(--v4-orange-dim)'}}>🔥</div>
              <div className="v4-kpi-trend v4-trend-up">▲ Produção ativa</div>
            </div>
            <div>
              <div className="v4-kpi-val">{loading ? '—' : stats.queueCount}</div>
              <div className="v4-kpi-lbl">Artigos na fila</div>
            </div>
            <div>
              <KpiBar pct={Math.min(100, stats.queueCount * 10)} color="linear-gradient(90deg,var(--v4-orange),#FFB340)"/>
              <div className="v4-kpi-hint">Agendados para publicação</div>
            </div>
          </div>

          {/* Blog ativo */}
          <div className="v4-kpi-card">
            <div className="v4-kpi-top">
              <div className="v4-kpi-icon" style={{background:'var(--v4-yellow-dim)'}}>⭐</div>
              <div className="v4-kpi-trend v4-trend-up">▲ Blog ativo</div>
            </div>
            <div>
              <div className="v4-kpi-val" style={{fontSize:'1.4rem'}}>{blog?.slug || '—'}</div>
              <div className="v4-kpi-lbl">Domínio do blog</div>
            </div>
            <div>
              <KpiBar pct={stats.totalArticles > 0 ? 100 : 30} color="linear-gradient(90deg,var(--v4-yellow),#FFA040)"/>
              <div className="v4-kpi-hint">omniseen.com/{blog?.slug}</div>
            </div>
          </div>
        </div>

        {/* ── TWO COL ──────────────────────────────────────────────────────── */}
        <div className="v4-two-col">

          {/* LEFT — Upcoming Articles */}
          <div className="v4-panel">
            <div className="v4-panel-header">
              <div className="v4-panel-title">◷ Próximos artigos</div>
              <button className="v4-panel-action" onClick={() => navigate('/client/content')}>Ver calendário →</button>
            </div>
            {upcoming.length === 0 && !loading && (
              <div className="v4-empty">Nenhum artigo agendado. Crie um novo no painel de conteúdo.</div>
            )}
            <div className="v4-sched-list">
              {upcoming.map(item => {
                const { day, mon } = fmtDate(item.scheduled_date || item.created_at);
                const { text, cls } = statusLabel(item.status);
                return (
                  <div key={item.id} className="v4-sched-item">
                    <div className="v4-sched-date">
                      <div className="v4-sched-day">{day}</div>
                      <div className="v4-sched-mon">{mon}</div>
                    </div>
                    <div className="v4-sched-body">
                      <div className="v4-sched-title">{item.title || item.keyword}</div>
                      <div className="v4-sched-keyword">{item.keyword}</div>
                    </div>
                    <div className={`v4-sched-status ${cls}`}>{text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Agent Activity */}
          <div className="v4-panel">
            <div className="v4-panel-header">
              <div className="v4-panel-title">⊕ Atividade dos agentes</div>
              <button className="v4-panel-action" onClick={() => navigate('/client/automation')}>Ver tudo →</button>
            </div>
            {activity.length === 0 && !loading && (
              <div className="v4-empty">Os agentes ainda não registraram atividade.</div>
            )}
            <div className="v4-activity-feed">
              {activity.map((item, i) => (
                <div key={item.id} className="v4-activity-item">
                  <div className="v4-activity-dot-wrap">
                    <div className="v4-activity-dot" style={{background: activityColor(item.event_type)}}/>
                    {i < activity.length - 1 && <div className="v4-activity-line"/>}
                  </div>
                  <div className="v4-activity-body">
                    <div className="v4-activity-text">{activityText(item)}</div>
                    <div className="v4-activity-time">{timeAgo(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Styles (scoped via v4- prefix) ──────────────────────────────────────────

const V4_STYLES = `
/* ── Variables ── */
.v4-dark {
  --v4-bg1:#0A0C10;--v4-bg2:#111318;--v4-bg3:#181B22;--v4-bg4:#1E2128;
  --v4-border:rgba(255,255,255,.07);--v4-border2:rgba(255,255,255,.12);
  --v4-text1:#F0F2F5;--v4-text2:#9BA3B4;--v4-text3:#5C6478;
  --v4-cyan:#00D4FF;--v4-cyan-dim:rgba(0,212,255,.12);
  --v4-green:#00FF88;--v4-green-dim:rgba(0,255,136,.10);
  --v4-orange:#FF7040;--v4-orange-dim:rgba(255,112,64,.12);
  --v4-yellow:#FFD060;--v4-yellow-dim:rgba(255,208,96,.12);
  --v4-radius:12px;--v4-radius-sm:8px;
}
.v4-light {
  --v4-bg1:#F4F6FA;--v4-bg2:#FFFFFF;--v4-bg3:#EEF0F5;--v4-bg4:#E5E8F0;
  --v4-border:rgba(0,0,0,.08);--v4-border2:rgba(0,0,0,.14);
  --v4-text1:#0D1117;--v4-text2:#4A5568;--v4-text3:#9AA3B0;
  --v4-cyan:#006FCC;--v4-cyan-dim:rgba(0,111,204,.10);
  --v4-green:#008050;--v4-green-dim:rgba(0,128,80,.10);
  --v4-orange:#C05030;--v4-orange-dim:rgba(192,80,48,.10);
  --v4-yellow:#B07020;--v4-yellow-dim:rgba(176,112,32,.10);
  --v4-radius:12px;--v4-radius-sm:8px;
}

/* ── Root ── */
.v4-root {
  min-height:100vh;background:var(--v4-bg1);color:var(--v4-text1);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:14px;line-height:1.5;
}

/* ── Topbar ── */
.v4-topbar {
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 24px;border-bottom:1px solid var(--v4-border);
  background:var(--v4-bg2);position:sticky;top:0;z-index:10;
  backdrop-filter:blur(16px);
}
.v4-topbar-greeting {
  font-size:.9rem;color:var(--v4-text2);
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
}
.v4-topbar-greeting span { color:var(--v4-text1);font-weight:600; }
.v4-topbar-city { color:var(--v4-text3);font-weight:400; }
.v4-topbar-date { font-size:.75rem;color:var(--v4-text3); }
.v4-topbar-actions { display:flex;align-items:center;gap:10px; }
.v4-theme-toggle,.v4-icon-btn {
  width:36px;height:36px;border-radius:50%;border:1px solid var(--v4-border2);
  background:var(--v4-bg3);display:flex;align-items:center;justify-content:center;
  font-size:1rem;cursor:pointer;position:relative;color:inherit;
  transition:background .2s;
}
.v4-theme-toggle:hover,.v4-icon-btn:hover { background:var(--v4-bg4); }
.v4-notif-dot {
  position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;
  background:var(--v4-orange);box-shadow:0 0 6px var(--v4-orange);
}

/* ── Content ── */
.v4-content { padding:24px;max-width:1200px;margin:0 auto; }

/* ── Hero ── */
.v4-hero {
  display:flex;align-items:flex-start;gap:32px;
  background:var(--v4-bg2);border:1px solid var(--v4-border);
  border-radius:var(--v4-radius);padding:28px 32px;margin-bottom:20px;
  position:relative;overflow:hidden;
}
.v4-hero::before {
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 80% at 5% 50%,rgba(0,212,255,.06) 0%,transparent 70%);
  pointer-events:none;
}

/* Score Ring */
.v4-score-ring { position:relative;flex-shrink:0; }
.v4-ring-bg { fill:none;stroke:rgba(255,255,255,.06);stroke-width:10;stroke-linecap:round; }
.v4-ring-fill {
  fill:none;stroke:url(#scoreGrad);stroke-width:10;stroke-linecap:round;
  transition:stroke-dasharray .8s ease;
}
.v4-dark .v4-ring-bg { stroke:rgba(255,255,255,.06); }
.v4-light .v4-ring-bg { stroke:rgba(0,0,0,.08); }
.v4-score-center {
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
}
.v4-score-num { font-size:1.8rem;font-weight:800;color:var(--v4-text1);line-height:1; }
.v4-score-label { font-size:.62rem;color:var(--v4-text3);letter-spacing:.08em;text-transform:uppercase; }

/* Hero info */
.v4-hero-info { flex:1;min-width:0; }
.v4-hero-title { font-size:1.25rem;font-weight:700;color:var(--v4-text1);margin-bottom:8px; }
.v4-hero-title span { color:var(--v4-cyan); }
.v4-hero-sub { font-size:.82rem;color:var(--v4-text2);line-height:1.6;margin-bottom:16px; }
.v4-hero-sub strong { color:var(--v4-text1); }

.v4-hero-stats { display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px; }
.v4-hero-stat {
  display:flex;flex-direction:column;gap:2px;
  padding:8px 16px;border-radius:var(--v4-radius-sm);
  background:var(--v4-bg3);border:1px solid var(--v4-border);
  cursor:default;
}
.v4-hero-stat-active { border-color:rgba(0,212,255,.3);background:rgba(0,212,255,.05); }
.v4-hero-stat-val { font-size:1rem;font-weight:700;color:var(--v4-text1); }
.v4-hero-stat-val span { font-size:.7rem;color:var(--v4-cyan);margin-left:4px; }
.v4-hero-stat-lbl { font-size:.65rem;color:var(--v4-text3);text-transform:uppercase;letter-spacing:.06em; }

.v4-hero-actions { display:flex;gap:8px;flex-wrap:wrap; }
.v4-btn-primary {
  padding:8px 18px;border-radius:var(--v4-radius-sm);border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--v4-cyan),#0066FF);color:#fff;
  font-size:.78rem;font-weight:600;letter-spacing:.04em;
  transition:opacity .2s,transform .15s;
}
.v4-btn-primary:hover { opacity:.85;transform:translateY(-1px); }
.v4-btn-secondary {
  padding:8px 16px;border-radius:var(--v4-radius-sm);cursor:pointer;
  background:var(--v4-bg3);border:1px solid var(--v4-border2);color:var(--v4-text2);
  font-size:.78rem;font-weight:500;
  transition:background .2s,color .2s;
}
.v4-btn-secondary:hover { background:var(--v4-bg4);color:var(--v4-text1); }

/* ── KPI Grid ── */
.v4-kpi-grid {
  display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;
}
@media(max-width:900px){ .v4-kpi-grid{grid-template-columns:repeat(2,1fr);} }
@media(max-width:500px){ .v4-kpi-grid{grid-template-columns:1fr;} }

.v4-kpi-card {
  background:var(--v4-bg2);border:1px solid var(--v4-border);
  border-radius:var(--v4-radius);padding:18px 16px;
  display:flex;flex-direction:column;gap:14px;
  transition:border-color .2s,transform .2s;
}
.v4-kpi-card:hover { border-color:var(--v4-border2);transform:translateY(-2px); }
.v4-kpi-top { display:flex;align-items:center;justify-content:space-between; }
.v4-kpi-icon {
  width:34px;height:34px;border-radius:var(--v4-radius-sm);
  display:flex;align-items:center;justify-content:center;font-size:1rem;
}
.v4-kpi-trend { font-size:.65rem;font-weight:600;padding:2px 8px;border-radius:20px; }
.v4-trend-up { color:var(--v4-green);background:var(--v4-green-dim); }
.v4-trend-down { color:var(--v4-orange);background:var(--v4-orange-dim); }
.v4-trend-flat { color:var(--v4-text3);background:var(--v4-bg3); }
.v4-kpi-val { font-size:2rem;font-weight:800;color:var(--v4-text1);line-height:1; }
.v4-kpi-lbl { font-size:.7rem;color:var(--v4-text2);margin-top:4px; }
.v4-kpi-bar-bg {
  height:4px;border-radius:2px;background:var(--v4-bg3);overflow:hidden;
}
.v4-kpi-bar { height:100%;border-radius:2px; }
.v4-kpi-hint { font-size:.62rem;color:var(--v4-text3);margin-top:4px; }

/* ── Two Col ── */
.v4-two-col {
  display:grid;grid-template-columns:1fr 1fr;gap:14px;
}
@media(max-width:700px){ .v4-two-col{grid-template-columns:1fr;} }

/* ── Panel ── */
.v4-panel {
  background:var(--v4-bg2);border:1px solid var(--v4-border);border-radius:var(--v4-radius);
  overflow:hidden;
}
.v4-panel-header {
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;border-bottom:1px solid var(--v4-border);
}
.v4-panel-title { font-size:.82rem;font-weight:600;color:var(--v4-text1); }
.v4-panel-action {
  font-size:.72rem;color:var(--v4-cyan);background:none;border:none;cursor:pointer;
  transition:opacity .2s;
}
.v4-panel-action:hover { opacity:.7; }
.v4-empty { padding:24px 16px;text-align:center;color:var(--v4-text3);font-size:.8rem; }

/* Scheduled list */
.v4-sched-list { padding:10px 14px;display:flex;flex-direction:column;gap:8px; }
.v4-sched-item {
  display:flex;align-items:center;gap:12px;padding:10px 8px;
  border-radius:var(--v4-radius-sm);background:var(--v4-bg3);
}
.v4-sched-date {
  display:flex;flex-direction:column;align-items:center;
  min-width:32px;
}
.v4-sched-day { font-size:1.1rem;font-weight:700;color:var(--v4-text1);line-height:1; }
.v4-sched-mon { font-size:.6rem;color:var(--v4-text3);text-transform:uppercase; }
.v4-sched-body { flex:1;min-width:0; }
.v4-sched-title {
  font-size:.78rem;font-weight:600;color:var(--v4-text1);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.v4-sched-keyword { font-size:.66rem;color:var(--v4-text3);margin-top:2px; }
.v4-sched-status {
  font-size:.62rem;font-weight:600;padding:3px 8px;border-radius:20px;white-space:nowrap;
}
.v4-sched-status-review { background:rgba(255,208,96,.12);color:var(--v4-yellow); }
.v4-sched-status-sched { background:rgba(0,212,255,.10);color:var(--v4-cyan); }
.v4-sched-status-draft { background:var(--v4-bg4);color:var(--v4-text3); }
.v4-sched-status-done { background:var(--v4-green-dim);color:var(--v4-green); }

/* Activity feed */
.v4-activity-feed { padding:12px 16px;display:flex;flex-direction:column;gap:0; }
.v4-activity-item { display:flex;gap:12px;padding-bottom:14px; }
.v4-activity-dot-wrap { display:flex;flex-direction:column;align-items:center;width:14px;flex-shrink:0; }
.v4-activity-dot {
  width:10px;height:10px;border-radius:50%;flex-shrink:0;
  box-shadow:0 0 6px currentColor;margin-top:3px;
}
.v4-activity-line { flex:1;width:2px;background:var(--v4-border);margin-top:4px; }
.v4-activity-body { flex:1;min-width:0; }
.v4-activity-text { font-size:.78rem;color:var(--v4-text2);line-height:1.4; }
.v4-activity-text strong { color:var(--v4-text1);font-weight:600; }
.v4-activity-text em { font-style:italic;color:var(--v4-text2); }
.v4-activity-time { font-size:.65rem;color:var(--v4-text3);margin-top:3px; }
`;
