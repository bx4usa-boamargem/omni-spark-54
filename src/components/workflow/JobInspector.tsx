import React, { useEffect, useState } from 'react';
import { Job, JobEvent } from '../../hooks/useWorkflowMonitor';
import { supabase } from '@/integrations/supabase/client';
import { Clock, RefreshCcw, XOctagon, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JobInspectorProps {
    job: Job | null;
    onClose: () => void;
}

export const JobInspector: React.FC<JobInspectorProps> = ({ job, onClose }) => {
    const [events, setEvents] = useState<JobEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    useEffect(() => {
        if (!job) {
            setEvents([]);
            return;
        }

        const fetchEvents = async () => {
            setLoadingEvents(true);
            const { data, error } = await supabase
                .from('job_events')
                .select('*')
                .eq('job_id', job.id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setEvents(data);
            }
            setLoadingEvents(false);
        };

        fetchEvents();

        const channel = supabase
            .channel(`job_events_${job.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'job_events',
                    filter: `job_id=eq.${job.id}`
                },
                (payload) => {
                    setEvents(prev => [...prev, payload.new as JobEvent]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [job]);

    if (!job) return null;

    const handleRetry = async () => {
        // Reset job status to queued and increment manually if not handled by edge function
        await supabase.from('jobs').update({
            status: 'queued',
            run_after: new Date().toISOString(),
            error_text: null
        }).eq('id', job.id);
    };

    const handleCancel = async () => {
        await supabase.from('jobs').update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
        }).eq('id', job.id);
    };

    const formatDuration = () => {
        if (!job.updated_at || !job.created_at) return 'N/A';
        const isRunningOrDone = ['running', 'done', 'failed', 'dead'].includes(job.status);
        if (!isRunningOrDone) return 'N/A';

        // basic calculation if we don't have exact accurate timer
        const start = new Date(job.created_at).getTime();
        const end = new Date(job.updated_at).getTime();
        if (end < start) return '0s';
        return `${((end - start) / 1000).toFixed(2)}s`;
    };

    return (
        <div className="w-[450px] flex flex-col h-full bg-white border-l shadow-xl overflow-hidden transition-all z-10 sticky top-0 right-0">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-lg text-gray-900 border-b-2 border-indigo-500 inline-block pb-1 capitalize">
                        {job.job_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">ID: {job.id}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                    &times;
                </button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-gray-50/50">

                {/* Status Card */}
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm mb-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 font-medium">Status</span>
                        <span className={`font-bold uppercase ${job.status === 'done' ? 'text-green-600' : job.status === 'failed' || job.status === 'dead' ? 'text-red-600' : 'text-blue-600'}`}>
                            {job.status}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 font-medium">Created</span>
                        <span className="text-gray-700">{new Date(job.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 font-medium">Est. Duration</span>
                        <span className="text-gray-700 flex items-center gap-1"><Clock size={14} /> {formatDuration()}</span>
                    </div>

                    {job.worker && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Worker</span>
                            <span className="text-gray-700 text-xs font-mono bg-gray-100 px-1 rounded">{job.worker}</span>
                        </div>
                    )}
                </div>

                {/* Error Details */}
                {job.error_text && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
                        <h4 className="text-red-800 text-xs font-bold uppercase mb-1">Error Message</h4>
                        <p className="text-red-700 text-sm break-words whitespace-pre-wrap font-mono">
                            {job.error_text}
                        </p>
                    </div>
                )}

                {/* Action Controls */}
                {['failed', 'dead', 'cancelled'].includes(job.status) && (
                    <div className="flex gap-2 mb-4">
                        <Button variant="outline" size="sm" className="flex-1 bg-white" onClick={handleRetry}>
                            <RefreshCcw className="w-4 h-4 mr-2 text-indigo-500" /> Retry Job
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1" onClick={handleCancel}>
                            <XOctagon className="w-4 h-4 mr-2" /> Cancel Job
                        </Button>
                    </div>
                )}

                {/* Payload */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Payload Definition</h4>
                    <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-emerald-400 text-xs font-mono">
                            {JSON.stringify(job.payload || {}, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* System Logs */}
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <Terminal size={14} /> Execution Logs
                    </h4>

                    <div className="space-y-3">
                        {loadingEvents && <Loader2 className="animate-spin text-gray-400 mx-auto" />}
                        {!loadingEvents && events.length === 0 && (
                            <p className="text-sm text-gray-400 italic">No events recorded yet.</p>
                        )}

                        {events.map((evt, idx) => (
                            <div key={idx} className="relative pl-4 border-l-2 border-indigo-100 flex flex-col pb-1">
                                <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-400" />
                                <div className="text-[10px] text-gray-400 font-mono mb-1">
                                    {new Date(evt.created_at).toISOString().split('T')[1].replace('Z', '')} - <span className="text-indigo-600 font-semibold">{evt.event_type}</span>
                                </div>
                                <div className="text-sm text-gray-700 bg-white p-2 rounded shadow-sm border border-gray-100">
                                    {evt.message}

                                    {evt.data_json && Object.keys(evt.data_json).length > 0 && (
                                        <pre className="mt-2 text-[10px] bg-gray-50 p-2 rounded text-gray-600 font-mono overflow-x-auto">
                                            {JSON.stringify(evt.data_json, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
