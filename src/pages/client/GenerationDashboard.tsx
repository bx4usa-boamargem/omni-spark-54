import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  'PENDING': '⏳ Aguardando...',
  'INPUT_VALIDATION': '✅ Validando...',
  'SERP_ANALYSIS': '🔍 Analisando SERP...',
  'NLP_KEYWORDS': '📊 Keywords NLP...',
  'TITLE_GEN': '✍️ Gerando título...',
  'OUTLINE_GEN': '📋 Criando outline...',
  'CONTENT_GEN': '📝 Escrevendo conteúdo...',
  'IMAGE_GEN': '🖼️ Gerando imagens...',
  'SEO_SCORE': '📈 Pontuando SEO...',
  'META_GEN': '🏷️ Meta tags...',
  'OUTPUT': '📦 Montando HTML...',
};

function statusBadge(status: string, needsReview?: boolean) {
  if (needsReview) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">⚠️ Revisão</Badge>;
  switch (status) {
    case 'pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    case 'running': return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300 animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Gerando</Badge>;
    case 'completed': return <Badge className="bg-green-500/20 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
    case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function GenerationDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('gen-jobs-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_jobs', filter: `user_id=eq.${user.id}` }, (payload) => {
        setJobs(prev => {
          const updated = payload.new as any;
          const idx = prev.findIndex(j => j.id === updated.id);
          if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
          return [updated, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Article Engine v1</h1>
          <p className="text-muted-foreground">Pipeline completo de geração com SEO Score e Quality Gates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs}><RefreshCw className="w-4 h-4 mr-1" />Atualizar</Button>
          <Button onClick={() => navigate('/client/articles/engine/new')}><Plus className="w-4 h-4 mr-1" />Novo Artigo</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">Nenhum artigo gerado ainda</p>
          <Button onClick={() => navigate('/client/articles/engine/new')}><Plus className="w-4 h-4 mr-1" />Criar Primeiro Artigo</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Etapa Atual</TableHead>
              <TableHead>SEO</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Criado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(job => {
              const input = job.input as Record<string, any> || {};
              return (
                <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/client/articles/engine/${job.id}`)}>
                  <TableCell className="font-medium">{input.keyword || '—'}</TableCell>
                  <TableCell>{statusBadge(job.status, job.needs_review)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.status === 'running' ? (STEP_LABELS[job.current_step] || job.current_step) : '—'}</TableCell>
                  <TableCell>{job.seo_score ? <span className={`font-semibold ${job.seo_score >= 80 ? 'text-green-600' : job.seo_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{job.seo_score}/100</span> : '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{job.engine_version || 'v1'}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(job.created_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
