import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addDays, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, TrendingUp, Users, DollarSign, FileText, Plus, Calendar as CalendarIcon, Pencil, Trash2, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcquisitionChannelsCard } from './AcquisitionChannelsCard';
import { TopReferrersCard } from './TopReferrersCard';

interface Goal {
  id: string;
  goal_type: string;
  target_value: number;
  period_type: string;
  period_start: string;
  period_end: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface GoalProgress {
  goal: Goal;
  currentValue: number;
  percentage: number;
  remaining: number;
  daysLeft: number;
  projectedValue: number;
}

const GOAL_TYPES = [
  { value: 'mrr', label: 'MRR (Receita Mensal)', icon: DollarSign, color: 'text-green-500' },
  { value: 'subscribers', label: 'Assinantes', icon: Users, color: 'text-blue-500' },
  { value: 'articles', label: 'Artigos Gerados', icon: FileText, color: 'text-purple-500' },
  { value: 'conversions', label: 'Conversões de Indicação', icon: TrendingUp, color: 'text-orange-500' },
  { value: 'referrals', label: 'Total de Indicações', icon: Award, color: 'text-pink-500' },
];

const PERIOD_TYPES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

export function GoalsManagementTab() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [periodFilter, setPeriodFilter] = useState('monthly');

  // Form state
  const [formType, setFormType] = useState('subscribers');
  const [formValue, setFormValue] = useState('');
  const [formPeriod, setFormPeriod] = useState('monthly');
  const [formStart, setFormStart] = useState<Date>(new Date());
  const [formEnd, setFormEnd] = useState<Date>(endOfMonth(new Date()));
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      calculateProgress();
    }
  }, [goals, periodFilter]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_goals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = async () => {
    const progressData: GoalProgress[] = [];
    const now = new Date();

    for (const goal of goals) {
      const periodStart = new Date(goal.period_start);
      const periodEnd = new Date(goal.period_end);
      
      // Check if goal is within current period filter
      if (!isGoalInPeriod(goal, periodFilter)) continue;

      let currentValue = 0;

      // Fetch current values based on goal type
      switch (goal.goal_type) {
        case 'mrr':
          const { data: subs } = await supabase
            .from('subscriptions')
            .select('plan')
            .eq('status', 'active');
          
          const planPrices: Record<string, number> = {
            starter: 97, professional: 197, business: 397, enterprise: 997
          };
          currentValue = (subs || []).reduce((acc, s) => acc + (planPrices[s.plan] || 0), 0);
          break;

        case 'subscribers':
          const { count: subCount } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
          currentValue = subCount || 0;
          break;

        case 'articles':
          const { count: articleCount } = await supabase
            .from('articles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', goal.period_start)
            .lte('created_at', goal.period_end);
          currentValue = articleCount || 0;
          break;

        case 'conversions':
          // Count subscriptions created in period as conversions
          const { count: convCount } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', goal.period_start)
            .lte('created_at', goal.period_end);
          currentValue = convCount || 0;
          break;

        case 'referrals':
          // Sum click_count from referrals in period
          const { data: refData } = await supabase
            .from('referrals')
            .select('click_count')
            .gte('created_at', goal.period_start)
            .lte('created_at', goal.period_end);
          currentValue = (refData || []).reduce((acc, r) => acc + (r.click_count || 0), 0);
          break;
      }

      const percentage = Math.min((currentValue / goal.target_value) * 100, 100);
      const remaining = Math.max(goal.target_value - currentValue, 0);
      const daysLeft = Math.max(differenceInDays(periodEnd, now), 0);
      
      // Calculate projection based on current rate
      const daysPassed = Math.max(differenceInDays(now, periodStart), 1);
      const totalDays = differenceInDays(periodEnd, periodStart);
      const dailyRate = currentValue / daysPassed;
      const projectedValue = Math.round(dailyRate * totalDays);

      progressData.push({
        goal,
        currentValue,
        percentage,
        remaining,
        daysLeft,
        projectedValue,
      });
    }

    setGoalsProgress(progressData);
  };

  const isGoalInPeriod = (goal: Goal, filter: string): boolean => {
    const now = new Date();
    const goalStart = new Date(goal.period_start);
    const goalEnd = new Date(goal.period_end);

    // Always show if it overlaps with current period
    return isWithinInterval(now, { start: goalStart, end: goalEnd }) || 
           goalEnd >= now;
  };

  const handlePeriodChange = (period: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'weekly':
        start = startOfWeek(now, { locale: ptBR });
        end = endOfWeek(now, { locale: ptBR });
        break;
      case 'biweekly':
        start = startOfWeek(now, { locale: ptBR });
        end = addDays(start, 13);
        break;
      case 'monthly':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarterly':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'yearly':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = now;
        end = addDays(now, 30);
    }

    setFormStart(start);
    setFormEnd(end);
    setFormPeriod(period);
  };

  const handleSaveGoal = async () => {
    if (!formValue || parseFloat(formValue) <= 0) {
      toast.error('Informe um valor válido para a meta');
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        goal_type: formType,
        target_value: parseFloat(formValue),
        period_type: formPeriod,
        period_start: format(formStart, 'yyyy-MM-dd'),
        period_end: format(formEnd, 'yyyy-MM-dd'),
        description: formDescription || null,
        created_by: user?.id,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('admin_goals')
          .update(goalData)
          .eq('id', editingGoal.id);
        if (error) throw error;
        toast.success('Meta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('admin_goals')
          .insert(goalData);
        if (error) throw error;
        toast.success('Meta criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      const { error } = await supabase
        .from('admin_goals')
        .update({ is_active: false })
        .eq('id', goalId);
      if (error) throw error;
      toast.success('Meta excluída com sucesso');
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao excluir meta');
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormType(goal.goal_type);
    setFormValue(goal.target_value.toString());
    setFormPeriod(goal.period_type);
    setFormStart(new Date(goal.period_start));
    setFormEnd(new Date(goal.period_end));
    setFormDescription(goal.description || '');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingGoal(null);
    setFormType('subscribers');
    setFormValue('');
    setFormPeriod('monthly');
    setFormStart(new Date());
    setFormEnd(endOfMonth(new Date()));
    setFormDescription('');
  };

  const getGoalIcon = (type: string) => {
    const goalType = GOAL_TYPES.find(g => g.value === type);
    return goalType ? goalType.icon : Target;
  };

  const getGoalColor = (type: string) => {
    const goalType = GOAL_TYPES.find(g => g.value === type);
    return goalType?.color || 'text-muted-foreground';
  };

  const formatValue = (type: string, value: number) => {
    if (type === 'mrr') {
      return `R$ ${value.toLocaleString('pt-BR')}`;
    }
    return value.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Metas & Objetivos</h2>
          <p className="text-muted-foreground">Defina e acompanhe suas metas de negócio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Meta</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(g => (
                        <SelectItem key={g.value} value={g.value}>
                          <div className="flex items-center gap-2">
                            <g.icon className={cn('h-4 w-4', g.color)} />
                            {g.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor da Meta</Label>
                  <Input
                    type="number"
                    placeholder={formType === 'mrr' ? 'Ex: 10000' : 'Ex: 100'}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={formPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(formStart, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formStart}
                          onSelect={(d) => d && setFormStart(d)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(formEnd, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formEnd}
                          onSelect={(d) => d && setFormEnd(d)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Meta de crescimento Q1"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSaveGoal}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Goals Progress Cards */}
      {goalsProgress.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma meta definida</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira meta para começar a acompanhar seu progresso
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Meta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goalsProgress.map(({ goal, currentValue, percentage, remaining, daysLeft, projectedValue }) => {
            const Icon = getGoalIcon(goal.goal_type);
            const willAchieve = projectedValue >= goal.target_value;
            
            return (
              <Card key={goal.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-5 w-5', getGoalColor(goal.goal_type))} />
                      <CardTitle className="text-base">
                        {GOAL_TYPES.find(g => g.value === goal.goal_type)?.label}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditGoal(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {goal.description && (
                    <CardDescription>{goal.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{formatValue(goal.goal_type, currentValue)}</p>
                      <p className="text-sm text-muted-foreground">
                        de {formatValue(goal.goal_type, goal.target_value)}
                      </p>
                    </div>
                    <Badge variant={percentage >= 100 ? 'default' : percentage >= 75 ? 'secondary' : 'outline'}>
                      {percentage.toFixed(0)}%
                    </Badge>
                  </div>

                  <Progress value={percentage} className="h-2" />

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Faltam</p>
                      <p className="font-medium">{formatValue(goal.goal_type, remaining)}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Dias restantes</p>
                      <p className="font-medium">{daysLeft}</p>
                    </div>
                    <div className={cn(
                      "rounded p-2",
                      willAchieve ? "bg-green-500/10" : "bg-orange-500/10"
                    )}>
                      <p className="text-muted-foreground">Projeção</p>
                      <p className={cn(
                        "font-medium",
                        willAchieve ? "text-green-600" : "text-orange-600"
                      )}>
                        {formatValue(goal.goal_type, projectedValue)}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    {format(new Date(goal.period_start), 'dd/MM')} - {format(new Date(goal.period_end), 'dd/MM/yyyy')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AcquisitionChannelsCard />
        <TopReferrersCard />
      </div>
    </div>
  );
}
