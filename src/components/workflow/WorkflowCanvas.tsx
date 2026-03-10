import React, { useMemo, useCallback } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    NodeMouseHandler,
    BackgroundVariant,
    Node,
    Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { JobNode } from './JobNode';
import { useWorkflowMonitor, Job } from '../../hooks/useWorkflowMonitor';
import { Loader2 } from 'lucide-react';

const nodeTypes = {
    jobNode: JobNode,
};

interface WorkflowCanvasProps {
    graphId: string | null;
    onNodeClick: (job: Job | null) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ graphId, onNodeClick }) => {
    const { nodes, edges, loading } = useWorkflowMonitor(graphId);

    // Create local state so viewport can interact if needed, though they are largely controlled by the hook
    const [localNodes, setNodes, onNodesChange] = useNodesState(nodes);
    const [localEdges, setEdges, onEdgesChange] = useEdgesState(edges);

    // Sync internal nodes state with hook data when the graph topology updates
    React.useEffect(() => {
        setNodes(nodes);
        setEdges(edges);
    }, [nodes, edges, setNodes, setEdges]);

    const handleNodeClick: NodeMouseHandler = useCallback(
        (_, node) => {
            onNodeClick(node.data?.job as Job || null);
        },
        [onNodeClick]
    );

    const handlePaneClick = useCallback(() => {
        onNodeClick(null);
    }, [onNodeClick]);

    if (!graphId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg m-4">
                <p className="text-gray-500 font-medium">Select a Job Graph to View</p>
            </div>
        );
    }

    if (loading && localNodes.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 m-4 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-500">Loading graph...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <ReactFlow
                nodes={localNodes}
                edges={localEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                fitView
                attributionPosition="bottom-right"
                defaultEdgeOptions={{
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                    animated: true
                }}
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls />
                <MiniMap zoomable pannable nodeClassName={(node) => `bg-${(node.data.job as Job)?.status || 'gray'}-500`} />
            </ReactFlow>
        </div>
    );
};
