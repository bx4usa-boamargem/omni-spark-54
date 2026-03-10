import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Job } from '../../hooks/useWorkflowMonitor';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, HardDrive } from 'lucide-react';

const statusColors: Record<string, string> = {
    queued: 'border-slate-300 bg-slate-50',
    running: 'border-blue-500 bg-blue-50 shadow-[0_0_15px_rgba(59,130,246,0.5)]',
    done: 'border-green-500 bg-green-50',
    failed: 'border-red-500 bg-red-50',
    retrying: 'border-orange-500 bg-orange-50',
    dead: 'border-red-800 bg-red-100',
};

const statusTextColors: Record<string, string> = {
    queued: 'text-slate-500',
    running: 'text-blue-600',
    done: 'text-green-600',
    failed: 'text-red-600',
    retrying: 'text-orange-600',
    dead: 'text-red-800',
};

const JobNodeComponent = ({ data, selected }: NodeProps) => {
    const job = data.job as Job;
    const status = job.status || 'queued';

    // Choose icon based on status
    let StatusIcon = Clock;
    let animClass = '';

    if (status === 'running') {
        StatusIcon = Loader2;
        animClass = 'animate-spin';
    } else if (status === 'done') {
        StatusIcon = CheckCircle2;
    } else if (status === 'failed') {
        StatusIcon = XCircle;
    } else if (status === 'retrying') {
        StatusIcon = AlertCircle;
    } else if (status === 'dead') {
        StatusIcon = HardDrive;
    }

    const borderClass = selected
        ? 'border-4 border-indigo-600 outline-none'
        : `border-2 ${statusColors[status] || statusColors.queued}`;

    return (
        <div className={`rounded-lg px-4 py-3 min-w-[200px] shadow-sm transition-all duration-300 ${borderClass}`}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 border-2" />

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center mb-1 border-b border-gray-200 pb-1">
                    <div className="font-semibold text-sm text-gray-800 capitalize">
                        {job.job_type.replace(/_/g, ' ')}
                    </div>
                    <div className={`${statusTextColors[status] || statusTextColors.queued}`}>
                        <StatusIcon size={16} className={animClass} />
                    </div>
                </div>

                <div className="text-xs text-gray-500 font-medium">
                    Status: <span className="uppercase text-gray-700">{status}</span>
                </div>

                {job.locked_by && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                        Worker: {job.locked_by.substring(0, 8)}...
                    </div>
                )}

                {job.try_count > 0 && (
                    <div className="text-xs text-orange-600 font-semibold mt-1">
                        Retries: {job.try_count}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2" />
        </div>
    );
};

export const JobNode = memo(JobNodeComponent);
