import { Card, CardContent } from "@/components/ui/card";
import { Eye, MousePointerClick, Users } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface DashboardProofOfValueProps {
    visits?: number;
    ctaClicks?: number;
    leads?: number;
}

export function DashboardProofOfValue({
    visits = 41,
    ctaClicks = 0,
    leads = 0,
}: DashboardProofOfValueProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold font-display flex items-center gap-2">
                        Prova de Valor
                    </h2>
                    <p className="text-sm text-muted-foreground">Últimos 7 dias vs período anterior</p>
                </div>
                <a href="/client/performance" className="text-sm font-medium text-primary flex items-center hover:underline">
                    Ver detalhes <ArrowUpRight className="ml-1 h-4 w-4" />
                </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Visitas Card */}
                <Card className="shadow-sm border-muted/60 relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-full bg-blue-500/10">
                                <Eye className="h-5 w-5 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Visitas</span>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-4xl font-bold">{visits}</span>
                            <span className="text-sm font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center mb-1">
                                <TrendingUpIcon /> +1950%
                            </span>
                        </div>
                        {/* Background decoration */}
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                    </CardContent>
                </Card>

                {/* Clicks no CTA Card */}
                <Card className="shadow-sm border-muted/60">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-full bg-orange-500/10">
                                <MousePointerClick className="h-5 w-5 text-orange-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Cliques no CTA</span>
                        </div>
                        <div className="flex items-end mt-4">
                            <span className="text-sm text-muted-foreground opacity-70">
                                Aguardando primeiro clique
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Leads Reais Card */}
                <Card className="shadow-sm border-muted/60">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-full bg-emerald-500/10">
                                <Users className="h-5 w-5 text-emerald-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Leads Reais</span>
                        </div>
                        <div className="flex items-end mt-4">
                            <span className="text-sm text-muted-foreground opacity-70">
                                Aguardando contatos
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function TrendingUpIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 mr-1"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}
