import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  AlertTriangle, 
  CreditCard, 
  ArrowRight, 
  Loader2,
  LogOut,
  RefreshCw
} from "lucide-react";

export default function Blocked() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, isPastDue, refresh, loading } = useSubscription();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const hasStripeCustomer = !!subscription?.stripe_customer_id;

  const handleManagePayment = async () => {
    if (!user?.id || !hasStripeCustomer) {
      navigate("/pricing");
      return;
    }
    
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "portal", userId: user.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal de pagamento. Tente ver os planos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleRefresh = async () => {
    await refresh();
    toast({
      title: "Verificando...",
      description: "Atualizando status da assinatura",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getBlockedMessage = () => {
    // Check if trial expired
    if (subscription?.status === 'trialing' && subscription?.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      if (trialEnd < new Date()) {
        return {
          title: "Período de teste encerrado",
          description: "Seu período de teste gratuito de 7 dias terminou. Escolha um plano para continuar usando a OMNISEEN.",
          color: "text-primary",
          bgColor: "bg-primary/10",
        };
      }
    }

    if (isPastDue) {
      return {
        title: "Pagamento pendente",
        description: "Houve um problema com seu pagamento. Atualize seu método de pagamento para continuar usando a plataforma.",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
      };
    }
    
    if (subscription?.status === 'canceled') {
      return {
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada. Escolha um plano para voltar a usar a plataforma.",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      };
    }

    return {
      title: "Assinatura inativa",
      description: "Sua assinatura não está ativa. Escolha um plano para acessar a plataforma.",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    };
  };

  const message = getBlockedMessage();

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-display font-bold">OMNISEEN</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Continue criando conteúdo incrível
          </h2>
          
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Regularize sua assinatura e volte a gerar artigos otimizados para SEO 
            com inteligência artificial.
          </p>
        </div>
      </div>

      {/* Right side - Blocked message */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 rounded-xl gradient-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold gradient-text">OMNISEEN</h1>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className={`mx-auto p-4 rounded-full ${message.bgColor} mb-4`}>
                <AlertTriangle className={`h-8 w-8 ${message.color}`} />
              </div>
              <CardTitle className="text-2xl font-display">{message.title}</CardTitle>
              <CardDescription className="text-base">
                {message.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Update Payment Button - only show if user has Stripe customer */}
              {hasStripeCustomer && (
                <Button 
                  className="w-full" 
                  onClick={handleManagePayment}
                  disabled={isLoadingPortal}
                >
                  {isLoadingPortal ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Atualizar método de pagamento
                </Button>
              )}

              {/* View Plans Button */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/pricing")}
              >
                Ver planos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {/* Refresh Status Button */}
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar status da assinatura
              </Button>

              {/* Sign Out Button */}
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Precisa de ajuda?{" "}
            <a href="/help" className="text-primary hover:underline">
              Entre em contato com nosso suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}