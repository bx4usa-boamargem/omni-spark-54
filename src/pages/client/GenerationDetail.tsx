import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Eye, Edit, CheckCircle, XCircle, Loader2, Clock, AlertTriangle } from "lucide-react";

const STEPS = ['INPUT_VALIDATION','SERP_ANALYSIS','NLP_KEYWORDS','TITLE_GEN','OUTLINE_GEN','CONTENT_GEN','IMAGE_GEN','SEO_SCORE','META_GEN','OUTPUT'] as const;
const STEP_LABELS: Record<string, string> = {
  INPUT_VALIDATION: 'Validação', SERP_ANALYSIS: 'SERP', NLP_KEYWORDS: 'NLP',
  TITLE_GEN: 'Título', OUTLINE_GEN: 'Outline', CONTENT_GEN: 'Conteúdo',
  IMAGE_GEN: 'Imagens', SEO_SCORE: 'SEO', META_GEN: 'Meta', OUTPUT: 'Output',
};

const SEO_METRICS = ['topic_coverage','entity_coverage','intent_match','depth_score','eeat_signals','structure','readability'];
const SEO_LABELS: Record<string,string> = { topic_coverage:'Cobertura', entity_coverage:'Entidades', intent_match:'Intenção', depth_score:'Profundidade', eeat_signals:'E-E-A-T', structure:'Estrutura', readability:'Legibilidade' };

export default function GenerationDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    const load = async () => {
      const [jobRes, stepsRes] = await Promise.all([
        supabase.from('generation_jobs').select('*').eq('id', jobId).single(),
        supabase.from('generation_steps').select('step_name, status, latency_ms, cost_usd').eq('job_id', jobId),
      ]);
      setJob(jobRes.data);
      setSteps(stepsRes.data || []);
      setLoading(false);
    };
    load();

    const channel = supabase.channel(`gen-job-${jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_jobs', filter: `id=eq.${jobId}` }, (p) => setJob(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_steps', filter: `job_id=eq.${jobId}` }, () => {
        supabase.from('generation_steps').select('step_name, status, latency_ms, cost_usd').eq('job_id', jobId).then(r => setSteps(r.data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job não encontrado</div>;

  const input = job.input as Record<string, any> || {};
  const completedSteps = new Set(steps.filter(s => s.status === 'completed').map(s => s.step_name));
  const failedSteps = new Set(steps.filter(s => s.status === 'failed').map(s => s.step_name));
  const seoBreakdown = (job.seo_breakdown as Record<string, any>) || {};
  const elapsed = job.completed_at && job.started_at ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000) : null;

  const downloadHtml = () => {
    const output = job.output as Record<string, any>;
    const outputStep = output?.OUTPUT as Record<string, any>;
    const html = output?.html_structured || outputStep?.html_structured || '<p>HTML não disponível</p>';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${input.keyword || 'artigo'}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/client/articles/engine')}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>

      {/* Header */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-1">"{input.keyword || '—'}"</h1>
            <p className="text-sm text-muted-foreground">{input.city || ''} {input.niche ? `• ${input.niche}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {job.needs_review && <Badge className="bg-yellow-500/20 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" />Revisão</Badge>}
            <Badge className={job.status === 'completed' ? 'bg-green-500/20 text-green-700' : job.status === 'failed' ? 'bg-red-500/20 text-red-700' : 'bg-blue-500/20 text-blue-700'}>
              {job.status === 'running' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              {job.status}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
          <div><span className="text-muted-foreground">SEO Score</span><p className="font-bold text-lg">{job.seo_score ?? '—'}/100</p></div>
          <div><span className="text-muted-foreground">Tempo</span><p className="font-bold">{elapsed ? `${Math.floor(elapsed/60)}m ${elapsed%60}s` : '—'}</p></div>
          <div><span className="text-muted-foreground">API Calls</span><p className="font-bold">{job.total_api_calls || 0}/15</p></div>
          <div><span className="text-muted-foreground">Custo</span><p className="font-bold">${(job.cost_usd || 0).toFixed(4)}</p></div>
        </div>
      </div>

      {/* Pipeline Progress */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="font-semibold mb-3 text-foreground">Pipeline</h3>
        <div className="flex flex-wrap gap-1">
          {STEPS.map(s => {
            const done = completedSteps.has(s);
            const failed = failedSteps.has(s);
            const running = job.current_step === s && job.status === 'running';
            return (
              <div key={s} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${done ? 'bg-green-100 text-green-700' : failed ? 'bg-red-100 text-red-700' : running ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                {done ? <CheckCircle className="w-3 h-3" /> : failed ? <XCircle className="w-3 h-3" /> : running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                {STEP_LABELS[s]}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEO Breakdown */}
      {Object.keys(seoBreakdown).length > 0 && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold mb-3 text-foreground">SEO Breakdown</h3>
          <div className="space-y-2">
            {SEO_METRICS.map(m => {
              const data = seoBreakdown[m] as Record<string, any> || {};
              const score = data.score ?? 0;
              return (
                <div key={m} className="flex items-center gap-3">
                  <span className="text-sm w-28 text-muted-foreground">{SEO_LABELS[m]}</span>
                  <Progress value={score} className="flex-1 h-2" />
                  <span className={`text-sm font-semibold w-10 text-right ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {job.status === 'completed' && (
        <div className="flex gap-2">
          {job.article_id && <Button onClick={() => navigate(`/client/articles/${job.article_id}/preview`)}><Eye className="w-4 h-4 mr-1" />Preview</Button>}
          {job.article_id && <Button variant="outline" onClick={() => navigate(`/client/articles/${job.article_id}/edit`)}><Edit className="w-4 h-4 mr-1" />Editar</Button>}
          <Button variant="outline" onClick={downloadHtml}><Download className="w-4 h-4 mr-1" />Download HTML</Button>
        </div>
      )}
    </div>
  );
}
