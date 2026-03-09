import { Card } from '@/components/ui/card';
import { MapPin, BarChart3, List, MoreHorizontal } from 'lucide-react';

export function DashboardTerritoryPerformance() {
    return (
        <Card className="p-6 border rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">Performance por Território</h3>
                        <p className="text-xs text-muted-foreground">Comparativo de oportunidades e conversões por região</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-emerald-100/50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-emerald-200">
                        ✦ 24 alto score
                    </span>
                    <div className="flex bg-muted rounded-md p-1">
                        <button className="px-3 py-1 text-xs font-medium bg-background shadow-sm rounded">7d</button>
                        <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">30d</button>
                        <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">90d</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="flex flex-col gap-1">
                    <span className="text-3xl font-bold text-foreground">1</span>
                    <span className="text-xs text-muted-foreground">Territórios ativos</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-3xl font-bold text-foreground">31</span>
                    <span className="text-xs text-muted-foreground">Total de oportunidades</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-3xl font-bold text-emerald-600">6</span>
                    <span className="text-xs text-muted-foreground">Artigos convertidos</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-3xl font-bold text-destructive">0</span>
                    <span className="text-xs text-muted-foreground">Visualizações totais</span>
                </div>
            </div>

            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-background shadow-sm text-sm font-medium text-foreground">
                    <List className="h-4 w-4" />
                    Ranking
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:bg-background/50">
                    <BarChart3 className="h-4 w-4" />
                    Gráfico
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:bg-background/50">
                    <MoreHorizontal className="h-4 w-4" />
                    Detalhes
                </button>
            </div>
        </Card>
    );
}
