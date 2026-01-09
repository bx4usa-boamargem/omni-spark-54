import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, ArrowLeft, CreditCard, Loader2, Calendar, Settings, TrendingUp,
  Receipt, ExternalLink, Download, AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
  current_period_start: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
}

interface Usage {
  articles_generated: number;
  articles_limit: number;
  images_generated: number;
  keywords_used: number;
  keywords_limit: number;
  ebooks_generated: number;
  ebooks_limit: number;
  blogs_count: number;
  blogs_limit: number;
}

interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Gratuito',
  lite: 'Lite',
  pro: 'Pro',
  business: 'Business',
  essential: 'Lite',
  plus: 'Pro',
  scale: 'Business',
};

const PLAN_PRICES: Record<string, { monthly: number; currency: string }> = {
  lite: { monthly: 39.99, currency: 'BRL' },
  pro: { monthly: 99.99, currency: 'BRL' },
  business: { monthly: 249.99, currency: 'BRL' },
  essential: { monthly: 39.99, currency: 'BRL' },
  plus: { monthly: 99.99, currency: 'BRL' },
  scale: { monthly: 249.99, currency: 'BRL' },
};

const PLAN_LIMITS: Record<string, { articles: number; keywords: number; blogs: number; ebooks: number }> = {
  free: { articles: 3, keywords: 10, blogs: 1, ebooks: 0 },
  lite: { articles: 30, keywords: 50, blogs: 1, ebooks: 2 },
  pro: { articles: 100, keywords: 200, blogs: 4, ebooks: 5 },
  business: { articles: -1, keywords: -1, blogs: 10, ebooks: -1 },
  essential: { articles: 30, keywords: 50, blogs: 1, ebooks: 2 },
  plus: { articles: 100, keywords: 200, blogs: 4, ebooks: 5 },
  scale: { articles: -1, keywords: -1, blogs: 10, ebooks: -1 },
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: 'Pago', variant: 'default' },
  open: { label: 'Aberta', variant: 'secondary' },
  draft: { label: 'Rascunho', variant: 'outline' },
  uncollectible: { label: 'Não cobrável', variant: 'destructive' },
  void: { label: 'Cancelada', variant: 'outline' },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
}

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { hasPermission, loading: roleLoading } = useCurrentUserRole();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (!roleLoading && !hasPermission("billing.access")) {
      navigate("/access-denied");
    }
  }, [roleLoading, hasPermission, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: "Bem-vindo!",
        description: "Sua assinatura foi ativada com sucesso.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subData) {
          setSubscription(subData);
        }

        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
        const { data: usageData } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .single();

        if (usageData) {
          setUsage(usageData as Usage);
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  // Fetch invoices and payment method
  useEffect(() => {
    async function fetchInvoices() {
      if (!user || !subscription?.stripe_customer_id) {
        setLoadingInvoices(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('list-invoices', {
          body: { userId: user.id },
        });

        if (error) throw error;

        if (data?.invoices) {
          setInvoices(data.invoices);
        }
        if (data?.paymentMethod) {
          setPaymentMethod(data.paymentMethod);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoadingInvoices(false);
      }
    }

    if (subscription) {
      fetchInvoices();
    }
  }, [user, subscription]);

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'portal',
          userId: user.id,
          returnUrl: window.location.href,
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
      console.error('Portal error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal. O Stripe pode não estar configurado.",
        variant: "destructive",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  if (loading || loadingData || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const planLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;
  const planPrice = PLAN_PRICES[currentPlan];
  const articlesUsed = usage?.articles_generated || 0;
  const articlesLimit = planLimits.articles;
  const usagePercentage = articlesLimit === -1 ? 0 : (articlesUsed / articlesLimit) * 100;
  const isTrialing = subscription?.status === 'trialing';
  const isCanceled = subscription?.canceled_at !== null;

  const trialDaysRemaining = subscription?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
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

      <main className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-8">Minha Assinatura</h1>

        <div className="grid gap-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Plano Atual
                  </CardTitle>
                  <CardDescription>
                    Detalhes da sua assinatura
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-display font-bold">
                    {PLAN_NAMES[currentPlan] || currentPlan}
                  </span>
                  {isTrialing && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                      Trial ({trialDaysRemaining} dias)
                    </Badge>
                  )}
                  {isCanceled && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                      Cancelado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {planPrice && (
                <div className="text-muted-foreground">
                  <span className="text-2xl font-bold text-foreground">
                    R$ {planPrice.monthly.toFixed(2)}
                  </span>
                  <span className="text-sm">/mês</span>
                </div>
              )}

              {subscription?.current_period_end && !isTrialing && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {isCanceled ? 'Acesso até' : 'Próxima cobrança'}:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                </div>
              )}

              {isTrialing && subscription?.trial_ends_at && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Seu período de teste termina em {new Date(subscription.trial_ends_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    Adicione um método de pagamento para continuar usando após o trial.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={handleManageSubscription} disabled={loadingPortal}>
                  {loadingPortal ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </>
                  )}
                </Button>
                {currentPlan !== 'business' && currentPlan !== 'scale' && (
                  <Button variant="outline" onClick={() => navigate("/pricing")}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pagamento
              </CardTitle>
              <CardDescription>
                Cartão cadastrado para cobrança
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-16 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ) : paymentMethod ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {paymentMethod.brand} •••• {paymentMethod.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expira {paymentMethod.exp_month.toString().padStart(2, '0')}/{paymentMethod.exp_year}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                    Atualizar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
                  <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                    Adicionar Cartão
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Uso do Mês</CardTitle>
              <CardDescription>
                Acompanhe seu consumo de recursos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Artigos gerados</span>
                  <span className="font-medium">
                    {articlesUsed} / {articlesLimit === -1 ? '∞' : articlesLimit}
                  </span>
                </div>
                {articlesLimit !== -1 && (
                  <Progress value={usagePercentage} className="h-2" />
                )}
              </div>

              {usage && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Palavras-chave analisadas</span>
                    <span className="font-medium">
                      {usage.keywords_used || 0} / {planLimits.keywords === -1 ? '∞' : planLimits.keywords}
                    </span>
                  </div>
                  {planLimits.keywords !== -1 && (
                    <Progress 
                      value={((usage.keywords_used || 0) / planLimits.keywords) * 100} 
                      className="h-2" 
                    />
                  )}
                </div>
              )}

              {usage && planLimits.ebooks !== 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>E-books criados</span>
                    <span className="font-medium">
                      {usage.ebooks_generated || 0} / {planLimits.ebooks === -1 ? '∞' : planLimits.ebooks}
                    </span>
                  </div>
                  {planLimits.ebooks !== -1 && (
                    <Progress 
                      value={((usage.ebooks_generated || 0) / planLimits.ebooks) * 100} 
                      className="h-2" 
                    />
                  )}
                </div>
              )}

              {usage && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Blogs ativos</span>
                    <span className="font-medium">
                      {usage.blogs_count || 0} / {planLimits.blogs}
                    </span>
                  </div>
                  <Progress 
                    value={((usage.blogs_count || 0) / planLimits.blogs) * 100} 
                    className="h-2" 
                  />
                </div>
              )}

              {usagePercentage >= 80 && articlesLimit !== -1 && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Você está chegando ao limite do seu plano. Considere fazer um upgrade para continuar criando artigos.
                  </p>
                </div>
              )}

              {articlesLimit === -1 && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary">
                    🎉 Você tem artigos ilimitados no seu plano!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Histórico de Faturas
              </CardTitle>
              <CardDescription>
                Suas faturas e recibos anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{formatDate(invoice.created)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {invoice.number || '-'}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(invoice.amount_paid, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_LABELS[invoice.status]?.variant || 'outline'}>
                            {STATUS_LABELS[invoice.status]?.label || invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {invoice.hosted_invoice_url && (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                                title="Ver fatura"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.invoice_pdf && (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma fatura disponível</p>
                  {isTrialing && (
                    <p className="text-sm mt-1">
                      Faturas serão geradas após o término do período de trial.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
