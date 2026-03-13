import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'running' | 'blocked' | 'error';
export type RunStatus   = 'queued' | 'running' | 'completed' | 'failed';
export type StepStatus  = 'running' | 'ok' | 'error' | 'skipped';

export interface AIOSAgent {
  id:           string;
  squad_id:     string;
  agent_id:     string;
  role:         string;
  display_name: string | null;
  description:  string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  skills:       string[] | null;
  system_prompt:string | null;
  is_enabled:   boolean;
  status:       AgentStatus;
  current_task: Record<string, unknown> | null;
  metrics:      { total_runs?: number; success_rate?: number; avg_latency_ms?: number } | null;
  last_active:  string | null;
  updated_at:   string;
}

export interface AIOSRun {
  id:           string;
  squad_id:     string;
  agent_id:     string | null;
  task_type:    string;
  blog_id:      string | null;
  params:       Record<string, unknown>;
  status:       RunStatus;
  result:       Record<string, unknown> | null;
  error:        string | null;
  started_at:   string | null;
  completed_at: string | null;
  created_at:   string;
}

export interface AIOSStepLog {
  id:           string;
  run_id:       string | null;
  squad_id:     string;
  agent_id:     string;
  step_name:    string;
  step_order:   number;
  status:       StepStatus;
  input_json:   Record<string, unknown>;
  output_json:  Record<string, unknown>;
  error:        string | null;
  tokens_in:    number;
  tokens_out:   number;
  cost_usd:     number;
  duration_ms:  number;
  created_at:   string;
}

interface UseAIOSRealtimeOptions {
  squadId?:    string;  // filtra por squad (undefined = todos)
  blogId?:     string;  // filtra runs por cliente
  runId?:      string;  // filtra step_logs por run específica
  maxRuns?:    number;  // limite de runs carregadas (default 50)
  maxLogs?:    number;  // limite de logs carregados (default 100)
}

interface AIOSRealtimeState {
  agents:       AIOSAgent[];
  runs:         AIOSRun[];
  stepLogs:     AIOSStepLog[];
  activeRun:    AIOSRun | null;
  loading:      boolean;
  error:        string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAIOSRealtime(options: UseAIOSRealtimeOptions = {}) {
  const {
    squadId,
    blogId,
    runId,
    maxRuns  = 50,
    maxLogs  = 100,
  } = options;

  const [state, setState] = useState<AIOSRealtimeState>({
    agents:    [],
    runs:      [],
    stepLogs:  [],
    activeRun: null,
    loading:   true,
    error:     null,
  });

  const channelsRef = useRef<RealtimeChannel[]>([]);

  // ── Patch helpers ──────────────────────────────────────────────────────────

  const patchAgent = useCallback((updated: AIOSAgent) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a =>
        a.squad_id === updated.squad_id && a.agent_id === updated.agent_id ? updated : a
      ),
    }));
  }, []);

  const patchRun = useCallback((updated: AIOSRun) => {
    setState(prev => ({
      ...prev,
      runs:      prev.runs.map(r => r.id === updated.id ? updated : r),
      activeRun: prev.activeRun?.id === updated.id ? updated : prev.activeRun,
    }));
  }, []);

  const addRun = useCallback((run: AIOSRun) => {
    setState(prev => ({
      ...prev,
      runs: [run, ...prev.runs].slice(0, maxRuns),
    }));
  }, [maxRuns]);

  const addStepLog = useCallback((log: AIOSStepLog) => {
    setState(prev => ({
      ...prev,
      stepLogs: [...prev.stepLogs, log].slice(-maxLogs),
    }));
  }, [maxLogs]);

  const patchStepLog = useCallback((updated: AIOSStepLog) => {
    setState(prev => ({
      ...prev,
      stepLogs: prev.stepLogs.map(l => l.id === updated.id ? updated : l),
    }));
  }, []);

  // ── Initial fetch ──────────────────────────────────────────────────────────

  const fetchInitialData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Agents
      let agentQuery = supabase
        .from('aios_agents')
        .select('*')
        .eq('is_enabled', true)
        .order('role');
      if (squadId) agentQuery = agentQuery.eq('squad_id', squadId);
      const { data: agentsData, error: agentsErr } = await agentQuery;
      if (agentsErr) throw agentsErr;

      // Runs
      let runQuery = supabase
        .from('aios_task_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxRuns);
      if (squadId) runQuery = runQuery.eq('squad_id', squadId);
      if (blogId)  runQuery = runQuery.eq('blog_id', blogId);
      const { data: runsData, error: runsErr } = await runQuery;
      if (runsErr) throw runsErr;

      // Step logs (se runId específico ou últimas 100 entradas do squad)
      let logsQuery = supabase
        .from('aios_step_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxLogs);
      if (runId)   logsQuery = logsQuery.eq('run_id', runId);
      else if (squadId) logsQuery = logsQuery.eq('squad_id', squadId);
      const { data: logsData, error: logsErr } = await logsQuery;
      if (logsErr) throw logsErr;

      // ActiveRun = primeiro run com status running/queued
      const active = (runsData as AIOSRun[]).find(
        r => r.status === 'running' || r.status === 'queued'
      ) ?? null;

      setState(prev => ({
        ...prev,
        agents:    (agentsData as AIOSAgent[]) || [],
        runs:      (runsData   as AIOSRun[])   || [],
        stepLogs:  ((logsData as AIOSStepLog[]) || []).reverse(),
        activeRun: active,
        loading:   false,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar dados do AIOS',
      }));
    }
  }, [squadId, blogId, runId, maxRuns, maxLogs]);

  // ── Realtime subscriptions ─────────────────────────────────────────────────

  useEffect(() => {
    fetchInitialData();

    // Cleanup previous channels
    channelsRef.current.forEach(c => c.unsubscribe());
    channelsRef.current = [];

    // 1. aios_agents
    const agentFilter = squadId
      ? `squad_id=eq.${squadId}`
      : undefined;
    const agentChannel = supabase
      .channel(`aios-agents-${squadId ?? 'all'}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'aios_agents',
        ...(agentFilter ? { filter: agentFilter } : {}),
      }, payload => {
        if (payload.eventType === 'UPDATE') patchAgent(payload.new as AIOSAgent);
      })
      .subscribe();

    // 2. aios_task_runs
    const runChannel = supabase
      .channel(`aios-runs-${squadId ?? 'all'}-${blogId ?? 'all'}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'aios_task_runs',
        ...(squadId ? { filter: `squad_id=eq.${squadId}` } : {}),
      }, payload => {
        if (payload.eventType === 'INSERT') addRun(payload.new as AIOSRun);
        if (payload.eventType === 'UPDATE') patchRun(payload.new as AIOSRun);
      })
      .subscribe();

    // 3. aios_step_logs
    const logFilter = runId
      ? `run_id=eq.${runId}`
      : squadId
        ? `squad_id=eq.${squadId}`
        : undefined;
    const logChannel = supabase
      .channel(`aios-logs-${runId ?? squadId ?? 'all'}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'aios_step_logs',
        ...(logFilter ? { filter: logFilter } : {}),
      }, payload => {
        if (payload.eventType === 'INSERT') addStepLog(payload.new as AIOSStepLog);
        if (payload.eventType === 'UPDATE') patchStepLog(payload.new as AIOSStepLog);
      })
      .subscribe();

    channelsRef.current = [agentChannel, runChannel, logChannel];

    return () => {
      channelsRef.current.forEach(c => c.unsubscribe());
      channelsRef.current = [];
    };
  }, [squadId, blogId, runId]);

  // ── Update agent (Master Admin pode editar) ────────────────────────────────

  const updateAgent = useCallback(async (
    squadId: string,
    agentId: string,
    patch: Partial<Pick<AIOSAgent,
      'display_name'|'description'|'avatar_emoji'|'avatar_color'|'skills'|'system_prompt'|'is_enabled'
    >>
  ) => {
    const { error } = await supabase
      .from('aios_agents')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('squad_id', squadId)
      .eq('agent_id', agentId);
    if (error) throw error;
    // O realtime listener vai atualizar o state automaticamente
  }, []);

  // ── Refresh manual ─────────────────────────────────────────────────────────

  const refresh = useCallback(() => fetchInitialData(), [fetchInitialData]);

  return {
    ...state,
    updateAgent,
    refresh,
  };
}
