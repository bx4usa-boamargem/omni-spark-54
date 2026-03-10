import React, { useState } from 'react';
import { Activity, Play, Square, RefreshCcw, AlertTriangle, CheckCircle2, ChevronRight, Database, MessageSquare, TerminalSquare } from 'lucide-react';

export const WorkflowMonitor: React.FC = () => {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [isEngineRunning, setIsEngineRunning] = useState(true);

    return (
        <div className="flex flex-col h-screen bg-[#fafafa] dark:bg-background text-slate-900 dark:text-foreground font-sans">
            {/* HEADER DE COMANDO */}
            <header className="bg-white dark:bg-card border-b border-slate-200 dark:border-border px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10 w-full overflow-x-hidden">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Motor de Tracking (ADM)</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">Motor Ativo • 24 jobs em fila</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap justify-end">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-border rounded-md hover:bg-slate-50 dark:hover:bg-accent text-slate-600 dark:text-muted-foreground whitespace-nowrap truncate max-w-[150px]">
                        <RefreshCcw size={14} className="shrink-0" /> Retry Falhas
                    </button>
                    <button
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 min-w-[150px] text-sm font-medium rounded-md text-white transition-colors ${isEngineRunning ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700' : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'}`}
                        onClick={() => setIsEngineRunning(!isEngineRunning)}
                    >
                        {isEngineRunning ? <><Square size={14} className="shrink-0" /> Pausar Motor</> : <><Play size={14} className="shrink-0" /> Retomar Motor</>}
                    </button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-border mx-2 hidden md:block"></div>
                    <div className="text-sm font-medium text-slate-600 dark:text-muted-foreground bg-slate-100 dark:bg-accent px-4 py-2 rounded-md border border-slate-200 dark:border-border truncate max-w-[280px]">
                        Geração Lote: Clínicas Odonto (Há 2 min) ▾
                    </div>
                </div>
            </header>

            {/* DASHBOARD RÁPIDO SUPERIOR */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4 shrink-0 bg-slate-50 dark:bg-background/50 border-b border-slate-200 dark:border-border w-full">
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} /></div>
                    <div><p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">Sucesso</p><p className="text-3xl font-bold">142</p></div>
                </div>
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-lg"><AlertTriangle className="text-red-600 dark:text-red-400" size={24} /></div>
                    <div><p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">Falhas Recentes</p><p className="text-3xl font-bold">3</p></div>
                </div>
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-border shadow-sm flex items-center gap-4 hidden md:flex">
                    <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-lg"><Activity className="text-blue-600 dark:text-blue-400" size={24} /></div>
                    <div><p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">Uso de Tokens</p><p className="text-3xl font-bold">45.2k</p></div>
                </div>
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-border shadow-sm flex items-center gap-4 hidden md:flex">
                    <div className="p-3 bg-orange-100 dark:bg-orange-500/10 rounded-lg"><RefreshCcw className="text-orange-600 dark:text-orange-400" size={24} /></div>
                    <div><p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">Auto-Retries</p><p className="text-3xl font-bold">12</p></div>
                </div>
            </div>

            {/* AREA DO CANVAS */}
            <main className="flex-1 flex overflow-hidden relative w-full" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>

                {/* Mocking the Flow visually */}
                <div className={`flex-1 transition-all duration-300 w-full ${selectedNode ? 'lg:mr-[500px]' : ''} p-6 md:p-12 relative flex items-center justify-center lg:justify-start lg:pl-24 overflow-x-auto overflow-y-hidden`}>
                    <div className="flex items-center gap-8 md:gap-12 min-w-max pb-16">

                        {/* Node 1 */}
                        <div
                            className={`bg-white dark:bg-card border-2 rounded-xl p-5 w-64 md:w-72 shadow-md cursor-pointer transition-all hover:border-indigo-400 dark:hover:border-indigo-500 ${selectedNode === 'trigger' ? 'border-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/30 scale-105' : 'border-slate-200 dark:border-border'}`}
                            onClick={() => setSelectedNode('trigger')}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-slate-100 dark:bg-accent text-slate-600 dark:text-foreground rounded"><Database size={20} /></div>
                                <h3 className="font-bold text-slate-800 dark:text-foreground">Supabase Listener</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-muted-foreground mb-4">Monitorando jobs_queue</p>
                            <div className="flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded">
                                <span>Status: ATIVO</span>
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                        </div>

                        <ChevronRight className="text-slate-400 dark:text-muted-foreground shrink-0" size={48} />

                        {/* Node 2 */}
                        <div
                            className={`bg-white dark:bg-card border-2 rounded-xl p-5 w-64 md:w-72 shadow-md cursor-pointer transition-all hover:border-indigo-400 dark:hover:border-indigo-500 ${selectedNode === 'ai' ? 'border-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/30 scale-105' : 'border-slate-200 dark:border-border'}`}
                            onClick={() => setSelectedNode('ai')}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded"><MessageSquare size={20} /></div>
                                <h3 className="font-bold text-slate-800 dark:text-foreground">Motor Anthropic</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-muted-foreground mb-4">Executando prompt v3...</p>
                            <div className="flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded">
                                <span>Status: RUNNING</span>
                                <RefreshCcw size={14} className="animate-spin" />
                            </div>
                        </div>

                    </div>
                </div>

                {/* INSPETOR DE DETALHES (O Painel Lateral) */}
                <div
                    className={`absolute right-0 top-0 bottom-0 w-full sm:w-[400px] lg:w-[500px] bg-white dark:bg-card border-l border-slate-200 dark:border-border shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-border flex justify-between items-center bg-slate-50 dark:bg-background/50">
                        <h2 className="font-bold text-xl text-slate-800 dark:text-foreground flex items-center gap-2">
                            <TerminalSquare size={20} className="text-indigo-600 dark:text-indigo-400" />
                            {selectedNode === 'trigger' ? 'Listener Details' : 'Motor Anthropic'}
                        </h2>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-foreground bg-white dark:bg-card border border-slate-200 dark:border-border p-1.5 rounded-md transition-colors">✕</button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-widest mb-3">Logs de Execução (Console)</h4>
                            <div className="bg-[#1e1e1e] text-emerald-400 font-mono text-xs sm:text-sm p-4 rounded-xl h-64 overflow-y-auto w-full leading-relaxed shadow-inner break-words">
                                [19:04:12] {selectedNode === 'trigger' ? 'INFO: Polling supabase queue...' : '[WARN] Rate limit threshold reached.'}<br />
                                [19:04:13] {selectedNode === 'trigger' ? 'INFO: 1 new job found (ID: 9f2a-8b1)' : '[INFO] Auto-retrying with exponential backoff...'}<br />
                                [19:04:15] {selectedNode === 'trigger' ? 'SUCCESS: Payload enviado ao Motor.' : '[INFO] Conexão com Claude reestabelecida.'}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-widest mb-3">Propriedades & Metadados</h4>
                            <div className="space-y-4 bg-slate-50 dark:bg-background/50 p-5 rounded-xl border border-slate-100 dark:border-border">
                                <div className="flex justify-between border-b border-slate-200 dark:border-border pb-3">
                                    <span className="text-slate-500 dark:text-muted-foreground">ID do Nó</span>
                                    <span className="font-mono text-slate-800 dark:text-foreground truncate ml-4">node_{selectedNode}_8x</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 dark:border-border pb-3">
                                    <span className="text-slate-500 dark:text-muted-foreground">Tempo de Vida</span>
                                    <span className="font-mono text-slate-800 dark:text-foreground">3.24s</span>
                                </div>
                                {selectedNode === 'ai' && (
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-500 dark:text-muted-foreground">Token Cost</span>
                                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">~ 245 Input</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-200 dark:border-border bg-slate-50 dark:bg-background/50 flex gap-4 mt-auto">
                        <button className="flex-1 bg-white dark:bg-card border-2 border-slate-200 dark:border-border text-slate-700 dark:text-foreground py-3 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-accent hover:border-slate-300 dark:hover:border-accent transition-colors">
                            Pular Execução
                        </button>
                        <button className="flex-1 bg-indigo-600 border-2 border-indigo-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 hover:border-indigo-700 transition-colors">
                            Forçar Play
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};
