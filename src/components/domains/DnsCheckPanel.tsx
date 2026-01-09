import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DnsCheckResult {
  status: "ok" | "missing" | "mismatch" | "error";
  found: string[];
  expected?: string;
  message?: string;
}

interface DnsReport {
  domain: string;
  checks: {
    txt: DnsCheckResult;
    cname: DnsCheckResult;
    a: DnsCheckResult;
  };
  overallStatus: "ready" | "pending" | "error";
  recommendations: string[];
}

interface DnsCheckPanelProps {
  blogId: string;
  customDomain: string;
  onReady?: () => void;
}

export function DnsCheckPanel({ blogId, customDomain, onReady }: DnsCheckPanelProps) {
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<DnsReport | null>(null);

  const checkDns = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-domain-dns", {
        body: { blogId },
      });

      if (error) throw error;

      setReport(data);
      
      if (data.overallStatus === "ready") {
        toast.success("DNS configurado corretamente!");
        onReady?.();
      }
    } catch (error) {
      console.error("Error checking DNS:", error);
      toast.error("Erro ao verificar DNS");
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "missing":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "mismatch":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">OK</Badge>;
      case "missing":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pendente</Badge>;
      case "mismatch":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Incorreto</Badge>;
      default:
        return <Badge variant="secondary">Erro</Badge>;
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "border-green-500/50 bg-green-50 dark:bg-green-900/20";
      case "pending":
        return "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "border-red-500/50 bg-red-50 dark:bg-red-900/20";
    }
  };

  if (!customDomain) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Verificação de DNS
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={checkDns}
          disabled={checking}
        >
          {checking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Checar DNS
            </>
          )}
        </Button>
      </div>

      {report && (
        <Alert className={getOverallStatusColor(report.overallStatus)}>
          <AlertDescription className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                Status: {report.overallStatus === "ready" ? "Pronto para verificar" : 
                        report.overallStatus === "pending" ? "Aguardando configuração" : "Erro"}
              </span>
              {getStatusIcon(report.overallStatus === "ready" ? "ok" : 
                            report.overallStatus === "pending" ? "missing" : "error")}
            </div>

            <div className="space-y-3">
              {/* TXT Record */}
              <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(report.checks.txt.status)}
                  <span className="text-sm">Registro TXT (_omniseen-verify)</span>
                </div>
                {getStatusBadge(report.checks.txt.status)}
              </div>

              {/* CNAME Record */}
              <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(report.checks.cname.status)}
                  <span className="text-sm">Registro CNAME</span>
                </div>
                {getStatusBadge(report.checks.cname.status)}
              </div>

              {/* A Record */}
              <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(report.checks.a.status)}
                  <span className="text-sm">Registro A</span>
                </div>
                {getStatusBadge(report.checks.a.status)}
              </div>
            </div>

            {report.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recomendações:</p>
                <ul className="text-sm space-y-1">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.checks.txt.found.length > 0 && report.checks.txt.status === "mismatch" && (
              <div className="text-xs text-muted-foreground">
                <p>Valor encontrado: {report.checks.txt.found.join(", ")}</p>
                <p>Valor esperado: {report.checks.txt.expected}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!report && (
        <p className="text-sm text-muted-foreground">
          Clique em "Checar DNS" para verificar se os registros estão configurados corretamente.
        </p>
      )}
    </div>
  );
}
