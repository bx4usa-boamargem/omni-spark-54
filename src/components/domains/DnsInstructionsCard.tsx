import { useState } from 'react';
import { Copy, Check, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DnsInstructionsCardProps {
  domain: string;
  verificationToken: string;
  blogId: string;
  onVerified?: () => void;
}

const EXPECTED_A_IP = '185.158.133.1';
const EXPECTED_CNAME = 'cname.lovableproject.com';

export function DnsInstructionsCard({ 
  domain, 
  verificationToken, 
  blogId,
  onVerified 
}: DnsInstructionsCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { blogId }
      });

      if (error) throw error;

      if (data?.verified) {
        toast.success('Domínio verificado com sucesso!');
        onVerified?.();
      } else {
        const message = data?.txtValid === false
          ? 'Registro TXT de verificação não encontrado. Aguarde a propagação DNS (até 48h).'
          : data?.aValid === false && data?.cnameValid === false
            ? 'Registro A ou CNAME não encontrado. Configure o roteamento corretamente.'
            : 'Verificação falhou. Verifique sua configuração DNS.';
        toast.error(message);
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Erro ao verificar domínio');
    } finally {
      setIsVerifying(false);
    }
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="h-8 px-2"
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          📋 Instruções de Configuração DNS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure os registros DNS abaixo no painel do seu provedor de domínio para ativar <strong>{domain}</strong>:
        </p>

        {/* Registro A */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Registro A (Roteamento)</span>
          </div>
          <div className="flex items-center justify-between bg-background rounded px-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tipo: <strong>A</strong></p>
              <p className="text-xs text-muted-foreground">Nome: <strong>@</strong> ou <strong>{domain}</strong></p>
              <p className="text-sm font-mono">{EXPECTED_A_IP}</p>
            </div>
            <CopyButton text={EXPECTED_A_IP} field="a-record" />
          </div>
        </div>

        {/* Registro CNAME alternativo */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">CNAME (Alternativa ao A)</span>
          </div>
          <div className="flex items-center justify-between bg-background rounded px-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tipo: <strong>CNAME</strong></p>
              <p className="text-xs text-muted-foreground">Nome: <strong>www</strong></p>
              <p className="text-sm font-mono">{EXPECTED_CNAME}</p>
            </div>
            <CopyButton text={EXPECTED_CNAME} field="cname-record" />
          </div>
        </div>

        {/* Registro TXT para verificação */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Registro TXT (Verificação)</span>
          </div>
          <div className="flex items-center justify-between bg-background rounded px-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tipo: <strong>TXT</strong></p>
              <p className="text-xs text-muted-foreground">Nome: <strong>_omniseen-verify</strong></p>
              <p className="text-sm font-mono break-all">{verificationToken}</p>
            </div>
            <CopyButton text={verificationToken} field="txt-record" />
          </div>
        </div>

        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm">
            Após configurar o DNS, aguarde até 48h para propagação. 
            Você também precisará adicionar este domínio no painel de domínios do Lovable como <strong>"Active"</strong>.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            onClick={handleVerifyDomain}
            disabled={isVerifying}
            className="flex-1"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Domínio
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`https://${domain}`, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Testar Domínio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
