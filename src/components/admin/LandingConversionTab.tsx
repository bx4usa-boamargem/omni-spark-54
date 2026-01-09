import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, MousePointer, UserPlus, TrendingUp, Eye, ArrowDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

interface LandingEvent {
  id: string;
  session_id: string;
  visitor_id: string | null;
  event_type: string;
  event_data: unknown;
  page_section: string | null;
  source: string | null;
  created_at: string;
}

const SECTION_ORDER = [
  'hero', 'problem', 'solution', 'automation', 
  'seo', 'audience', 'how_it_works', 'pricing', 'final_cta'
];

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  problem: 'Problema',
  solution: 'Solução',
  automation: 'Automação',
  seo: 'SEO',
  audience: 'Audiência',
  how_it_works: 'Como Funciona',
  pricing: 'Preços',
  final_cta: 'CTA Final'
};

const SOURCE_COLORS: Record<string, string> = {
  organic: '#22c55e',
  social: '#3b82f6',
  referral: '#f59e0b',
  paid: '#ef4444',
  direct: '#8b5cf6'
};

const PLAN_COLORS = ['#6366f1', '#22c55e', '#f59e0b'];

export function LandingConversionTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<LandingEvent[]>([]);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchEvents();
  }, [period]);

  const fetchEvents = async () => {
    setLoading(true);
    const startDate = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('landing_page_events')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landing events:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const uniqueSessions = new Set(events.map(e => e.session_id)).size;
    const pageViews = events.filter(e => e.event_type === 'page_view').length;
    const ctaClicks = events.filter(e => e.event_type === 'cta_click').length;
    const signups = events.filter(e => e.event_type === 'signup_complete').length;
    const conversionRate = pageViews > 0 ? (signups / pageViews) * 100 : 0;

    return { uniqueSessions, pageViews, ctaClicks, signups, conversionRate };
  }, [events]);

  const funnelData = useMemo(() => {
    const pageViews = events.filter(e => e.event_type === 'page_view').length;
    const heroClicks = events.filter(e => e.event_type === 'cta_click' && e.page_section === 'hero').length;
    const pricingViews = events.filter(e => e.event_type === 'pricing_view' || e.page_section === 'pricing').length;
    const planSelects = events.filter(e => e.event_type === 'plan_select').length;
    const signupStarts = events.filter(e => e.event_type === 'signup_start').length;
    const signupCompletes = events.filter(e => e.event_type === 'signup_complete').length;

    return [
      { name: 'Visitantes', value: pageViews, percent: 100 },
      { name: 'Clique Hero CTA', value: heroClicks, percent: pageViews > 0 ? (heroClicks / pageViews) * 100 : 0 },
      { name: 'Viu Preços', value: pricingViews, percent: pageViews > 0 ? (pricingViews / pageViews) * 100 : 0 },
      { name: 'Escolheu Plano', value: planSelects, percent: pageViews > 0 ? (planSelects / pageViews) * 100 : 0 },
      { name: 'Iniciou Cadastro', value: signupStarts, percent: pageViews > 0 ? (signupStarts / pageViews) * 100 : 0 },
      { name: 'Cadastro Completo', value: signupCompletes, percent: pageViews > 0 ? (signupCompletes / pageViews) * 100 : 0 },
    ];
  }, [events]);

  const sectionScrollData = useMemo(() => {
    const sectionCounts: Record<string, number> = {};
    const sectionEvents = events.filter(e => e.event_type === 'section_view');
    
    sectionEvents.forEach(e => {
      if (e.page_section) {
        sectionCounts[e.page_section] = (sectionCounts[e.page_section] || 0) + 1;
      }
    });

    const pageViews = events.filter(e => e.event_type === 'page_view').length || 1;

    return SECTION_ORDER.map(section => ({
      section: SECTION_LABELS[section] || section,
      views: sectionCounts[section] || 0,
      percent: Math.round(((sectionCounts[section] || 0) / pageViews) * 100)
    }));
  }, [events]);

  const sourceData = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    const pageViewEvents = events.filter(e => e.event_type === 'page_view');
    
    pageViewEvents.forEach(e => {
      const source = e.source || 'direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts).map(([source, count]) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      value: count,
      color: SOURCE_COLORS[source] || '#64748b'
    }));
  }, [events]);

  const planData = useMemo(() => {
    const planCounts: Record<string, number> = {};
    const planEvents = events.filter(e => e.event_type === 'plan_select' || e.event_type === 'signup_complete');
    
    planEvents.forEach(e => {
      const eventData = e.event_data as Record<string, unknown> | null;
      const planName = (eventData?.plan_name as string) || (eventData?.selected_plan as string) || 'Unknown';
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    });

    return Object.entries(planCounts).map(([plan, count], index) => ({
      name: plan,
      value: count,
      color: PLAN_COLORS[index % PLAN_COLORS.length]
    }));
  }, [events]);

  const trendData = useMemo(() => {
    const dailyData: Record<string, { date: string; visits: number; signups: number; rate: number }> = {};
    const days = parseInt(period);

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyData[date] = { date, visits: 0, signups: 0, rate: 0 };
    }

    // Count events per day
    events.forEach(e => {
      const date = format(new Date(e.created_at), 'yyyy-MM-dd');
      if (dailyData[date]) {
        if (e.event_type === 'page_view') dailyData[date].visits++;
        if (e.event_type === 'signup_complete') dailyData[date].signups++;
      }
    });

    // Calculate rates
    Object.values(dailyData).forEach(day => {
      day.rate = day.visits > 0 ? (day.signups / day.visits) * 100 : 0;
    });

    return Object.values(dailyData).map(d => ({
      ...d,
      dateLabel: format(new Date(d.date), 'dd/MM', { locale: ptBR })
    }));
  }, [events, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conversão da Landing Page</h2>
          <p className="text-muted-foreground">Métricas de visitantes e conversões</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
            <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{metrics.uniqueSessions.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">Sessões únicas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
            <CardTitle className="text-sm font-medium">Cliques em CTA</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <MousePointer className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{metrics.ctaClicks.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">Total de cliques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
            <CardTitle className="text-sm font-medium">Cadastros</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UserPlus className="h-5 w-5 text-green-500 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-green-600">{metrics.signups.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">Signups completos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-primary">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground mt-2">Visitantes → Signup</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="h-5 w-5" />
              Funil de Conversão
            </CardTitle>
            <CardDescription>Jornada do visitante até o cadastro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.map((step, index) => (
              <div key={step.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{step.name}</span>
                  <span className="font-medium">{step.value} ({step.percent.toFixed(1)}%)</span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${step.percent}%` }}
                  />
                </div>
                {index < funnelData.length - 1 && funnelData[index + 1].value < step.value && (
                  <p className="text-xs text-red-500">
                    ↓ {(((step.value - funnelData[index + 1].value) / step.value) * 100).toFixed(0)}% drop-off
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section Scroll Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Scroll por Seção
            </CardTitle>
            <CardDescription>% de visitantes que viram cada seção</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectionScrollData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="section" type="category" width={80} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="percent" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Origens de Tráfego</CardTitle>
            <CardDescription>De onde vêm os visitantes</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans Selected */}
        <Card>
          <CardHeader>
            <CardTitle>Planos Selecionados</CardTitle>
            <CardDescription>Distribuição de interesse por plano</CardDescription>
          </CardHeader>
          <CardContent>
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Conversão</CardTitle>
          <CardDescription>Taxa de conversão ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" />
              <YAxis unit="%" />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'rate' ? `${value.toFixed(1)}%` : value,
                  name === 'rate' ? 'Taxa' : name === 'visits' ? 'Visitas' : 'Signups'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
