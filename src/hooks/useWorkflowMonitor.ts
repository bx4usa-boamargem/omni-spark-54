import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Node, Edge } from '@xyflow/react';

// Simplified dagre layout algorithm calculation directly in the hook for now
// In a full prod version we'd use the `dagre` package.

export interface JobGraph {
    id: string;
    tenant_id: string;
    graph_type: string;
    root_job_id: string;
    status: string;
    created_at: string;
}

export interface Job {
    id: string;
    job_type: string;
    status: string;
    run_after: string;
    worker?: string;
    try_count: number;
    payload?: any;
    created_at: string;
    updated_at: string;
    locked_by?: string;
    error_text?: string;
}

export interface JobDependency {
    id: string;
    graph_id: string;
    job_id: string; // The job
    depends_on_job_id: string; // Depends on this job
}

export interface JobEvent {
    id: string;
    job_id: string;
    event_type: string;
    message: string;
    created_at: string;
    data_json?: any;
}

export const useWorkflowMonitor = (graphId: string | null) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [jobsData, setJobsData] = useState<Record<string, Job>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!graphId) {
            setNodes([]);
            setEdges([]);
            setJobsData({});
            return;
        }

        const fetchGraphData = async () => {
            setLoading(true);
            try {
                // Fetch jobs for this graph
                const { data: jobs, error: jobsError } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('graph_id', graphId);

                if (jobsError) throw jobsError;

                // Fetch dependencies for this graph
                const { data: deps, error: depsError } = await supabase
                    .from('job_dependencies')
                    .select('*')
                    .eq('graph_id', graphId);

                if (depsError) throw depsError;

                const jobsMap: Record<string, Job> = {};
                jobs.forEach(j => {
                    jobsMap[j.id] = j;
                });

                setJobsData(jobsMap);

                // Build react-flow nodes
                // A simple layout algo: 
                // 1. find root (no incoming edges)
                // 2. assign level 0
                // 3. BFS to assign levels
                // 4. Position based on level and index within level

                const inDegree: Record<string, number> = {};
                const adj: Record<string, string[]> = {};

                jobs.forEach(j => {
                    inDegree[j.id] = 0;
                    adj[j.id] = [];
                });

                const newEdges: Edge[] = [];
                deps.forEach(d => {
                    // dependency: job_id DEPENDS ON depends_on_job_id
                    // Thus, the flow is: depends_on_job_id -> job_id
                    if (adj[d.depends_on_job_id]) {
                        adj[d.depends_on_job_id].push(d.job_id);
                    }
                    if (inDegree[d.job_id] !== undefined) {
                        inDegree[d.job_id]++;
                    }
                    newEdges.push({
                        id: `e-${d.depends_on_job_id}-${d.job_id}`,
                        source: d.depends_on_job_id,
                        target: d.job_id,
                        animated: true,
                        style: { stroke: '#94a3b8', strokeWidth: 2 }
                    });
                });

                const queue: string[] = [];
                const levels: Record<string, number> = {};

                Object.keys(inDegree).forEach(id => {
                    if (inDegree[id] === 0) {
                        queue.push(id);
                        levels[id] = 0;
                    }
                });

                while (queue.length > 0) {
                    const u = queue.shift()!;
                    const currentLvl = levels[u];
                    (adj[u] || []).forEach(v => {
                        levels[v] = Math.max(levels[v] || 0, currentLvl + 1);
                        inDegree[v]--;
                        if (inDegree[v] === 0) {
                            queue.push(v);
                        }
                    });
                }

                // Now we assign X/Y based on levels
                const levelCounts: Record<number, number> = {};
                const newNodes: Node[] = [];

                jobs.forEach(j => {
                    const lvl = levels[j.id] || 0;
                    const idx = levelCounts[lvl] || 0;
                    levelCounts[lvl] = idx + 1;

                    // spacing: x = idx * 250, y = lvl * 150
                    newNodes.push({
                        id: j.id,
                        type: 'jobNode',
                        data: { job: j },
                        position: { x: idx * 250, y: lvl * 150 }
                    });
                });

                // Center nodes in each level
                const maxNodesInLvl = Math.max(...Object.values(levelCounts));
                newNodes.forEach(n => {
                    const lvl = levels[n.id] || 0;
                    const countInLvl = levelCounts[lvl];
                    const offset = (maxNodesInLvl - countInLvl) * 125;
                    n.position.x += offset;
                });

                setNodes(newNodes);
                setEdges(newEdges);

            } catch (err) {
                console.error('Error fetching graph data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchGraphData();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'jobs',
                    filter: `graph_id=eq.${graphId}`
                },
                (payload) => {
                    setNodes((nds) =>
                        nds.map((n) => {
                            if (n.id === payload.new.id) {
                                return {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        job: payload.new as Job,
                                    },
                                };
                            }
                            return n;
                        })
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [graphId]);

    return { nodes, edges, jobsData, loading };
};
