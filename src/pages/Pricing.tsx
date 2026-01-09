import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCaptureReferral, getStoredReferralCode } from "@/hooks/useReferral";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, ArrowLeft, Loader2, XCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    usd: { monthly: number; yearly: number };
    brl: { monthly: number; yearly: number };
  };
  features: string[];
  popular: boolean;
}

const plans: Plan[] = [
  {
    id: 'lite',
    name: 'Lite',
    description: 'Para novos blogueiros que estão começando',
    price: {
      usd: { monthly: 17.99, yearly: 13.49 },
      brl: { monthly: 89, yearly: 66.75 },
    },
    features: [
      '30 artigos/mês',
      '1 blog automatizado',
      '50 palavras-chave',
      '1 membro na equipe',
      'Blog com sua marca',
      'Sugestões inteligentes',
      'Linkagem interna/externa',
      'Análise de keywords',
      'Relatório semanal',
      'Suporte por email',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para blogueiros em crescimento prontos para expandir',
    price: {
      usd: { monthly: 39.99, yearly: 29.99 },
      brl: { monthly: 199, yearly: 149.25 },
    },
    features: [
      '100 artigos/mês',
      '4 blogs automatizados',
      '200 palavras-chave',
      '5 membros na equipe',
      'Domínio personalizado',
      'SEO avançado',
      'Clusters de conteúdo',
      '5 e-books/mês',
      'Imagens IA',
      'Tradução automática',
      'Suporte prioritário',
    ],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Para equipes gerenciando vários sites',
    price: {
      usd: { monthly: 69.99, yearly: 52.49 },
      brl: { monthly: 349, yearly: 261.75 },
    },
    features: [
      'Artigos ilimitados',
      '10 blogs automatizados',
      'Keywords ilimitadas',
      '15 membros na equipe',
      'Funil de vendas',
      'E-books ilimitados',
      'Área do cliente',
      'Calendário editorial',
      'Gerente dedicado',
      'Acesso à API',
      'White label',
    ],
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Capture referral code from URL
  useCaptureReferral();

  const currency = useMemo(() => {
    return i18n.language === 'pt-BR' ? 'brl' : 'usd';
  }, [i18n.language]);

  const currencySymbol = currency === 'brl' ? 'R$' : '$';

  const formatPrice = (price: number): string => {
    if (currency === 'brl') {
      return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(2);
  };

  const getPrice = (plan: Plan): number => {
    return isYearly 
      ? plan.price[currency as 'usd' | 'brl'].yearly 
      : plan.price[currency as 'usd' | 'brl'].monthly;
  };

  const getOriginalMonthly = (plan: Plan): number => {
    return plan.price[currency as 'usd' | 'brl'].monthly;
  };

  const getSavings = (plan: Plan): number => {
    const monthly = plan.price[currency as 'usd' | 'brl'].monthly;
    const yearly = plan.price[currency as 'usd' | 'brl'].yearly;
    return Math.round(((monthly - yearly) / monthly) * 100);
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      // User not logged in: redirect to auth with plan params to start trial
      navigate(`/auth?plan=${planId}&period=${isYearly ? 'yearly' : 'monthly'}`);
      return;
    }

    setLoadingPlan(planId);

    try {
      // Get referral code from localStorage
      const referralCode = getStoredReferralCode();

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId,
          billingPeriod: isYearly ? 'yearly' : 'monthly',
          userId: user.id,
          email: user.email,
          currency,
          successUrl: `${window.location.origin}/subscription?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
          referralCode,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout. O Stripe pode não estar configurado.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg gradient-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">OMNISEEN</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">
            Automatize seu <span className="gradient-text">blog</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Obtenha mais tráfego do Google e do ChatGPT.
          </p>
          <p className="text-muted-foreground">
            Comece com 7 dias grátis. Cancele quando quiser.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Mensal
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Anual
              </span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                Economize 25%
              </Badge>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col transition-all ${plan.popular ? 'border-primary shadow-lg scale-105 z-10' : 'hover:border-primary/50'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-primary text-primary-foreground">
                    🔥 Mais popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4 pt-8">
                <CardTitle className="text-2xl font-display">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  {isYearly && (
                    <div className="text-muted-foreground line-through text-sm mb-1">
                      {currencySymbol}{formatPrice(getOriginalMonthly(plan))}/mês
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                    <span className="text-4xl font-display font-bold">
                      {formatPrice(getPrice(plan))}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600 mt-1">
                      Economize {getSavings(plan)}%
                    </p>
                  )}
                  {isYearly && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Faturado anualmente
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className={`w-full ${plan.popular ? 'gradient-primary text-primary-foreground' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Começar Grátis'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* ROI Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-display font-bold mb-2">
              Compare seu Retorno sobre Investimento
            </h3>
            <p className="text-muted-foreground">
              Veja quanto você economiza em tempo e dinheiro com a OMNISEEN
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sem OMNISEEN */}
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Sem OMNISEEN
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Redator freelancer (30 artigos)</span>
                  <span className="font-bold">R$ 3.000/mês</span>
                </div>
                <div className="flex justify-between">
                  <span>Especialista SEO</span>
                  <span className="font-bold">R$ 2.500/mês</span>
                </div>
                <div className="flex justify-between">
                  <span>Designer de imagens</span>
                  <span className="font-bold">R$ 1.500/mês</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span>Tempo gasto: 40h/mês</span>
                  <span className="font-bold text-destructive">R$ 7.000+</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Com OMNISEEN */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  Com OMNISEEN Pro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>100 artigos otimizados/mês</span>
                  <span className="font-bold text-green-600">Incluído</span>
                </div>
                <div className="flex justify-between">
                  <span>SEO automático + GSC</span>
                  <span className="font-bold text-green-600">Incluído</span>
                </div>
                <div className="flex justify-between">
                  <span>Imagens IA ilimitadas</span>
                  <span className="font-bold text-green-600">Incluído</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span>Tempo gasto: 2h/mês</span>
                  <span className="font-bold text-primary">R$ 149/mês</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-lg">Você economiza</span>
                  <Badge className="text-lg px-3 py-1 bg-green-500 text-white">
                    R$ 6.851/mês
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ or Trust Badges */}
        <div className="text-center mt-12 text-muted-foreground">
          <p>Pagamento seguro via Stripe • Cancele a qualquer momento • Suporte dedicado</p>
        </div>
      </main>
    </div>
  );
}
