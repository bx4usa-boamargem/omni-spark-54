import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Award, Users, MousePointer } from 'lucide-react';
import { format, subDays, subMonths, startOfYear } from 'date-fns';

interface Referrer {
  id: string;
  name: string | null;
  totalClicks: number;
  referralCode: string;
  isActive: boolean;
}

export function TopReferrersCard() {
  const [loading, setLoading] = useState(true);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchTopReferrers();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return subDays(now, 7);
      case 'month':
        return subMonths(now, 1);
      case 'quarter':
        return subMonths(now, 3);
      case 'year':
        return startOfYear(now);
      default:
        return subMonths(now, 1);
    }
  };

  const fetchTopReferrers = async () => {
    setLoading(true);
    try {
      const startDate = format(getDateRange(), 'yyyy-MM-dd');

      // Fetch referrals with referrer info
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          referrer_user_id,
          referral_code,
          click_count,
          is_active,
          created_at
        `)
        .gte('created_at', startDate)
        .order('click_count', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get profile names for each referrer
      const referrerList: Referrer[] = [];
      
      for (const ref of referrals || []) {
        if (!ref.referrer_user_id) continue;

        // Fetch referrer profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', ref.referrer_user_id)
          .single();

        referrerList.push({
          id: ref.referrer_user_id,
          name: profile?.full_name || null,
          totalClicks: ref.click_count || 0,
          referralCode: ref.referral_code || '',
          isActive: ref.is_active || false,
        });
      }

      setReferrers(referrerList);
    } catch (error) {
      console.error('Error fetching top referrers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, code: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return code.slice(0, 2).toUpperCase();
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">🥇 1º</Badge>;
      case 1:
        return <Badge className="bg-gray-400/20 text-gray-600 border-gray-400/30">🥈 2º</Badge>;
      case 2:
        return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">🥉 3º</Badge>;
      default:
        return <Badge variant="outline">{index + 1}º</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top Indicadores
            </CardTitle>
            <CardDescription>
              Ranking dos parceiros com mais cliques
            </CardDescription>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {referrers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum indicador encontrado neste período
          </div>
        ) : (
          <div className="space-y-3">
            {referrers.map((referrer, index) => (
              <div 
                key={referrer.id} 
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10">
                  {getRankBadge(index)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(referrer.name, referrer.referralCode)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {referrer.name || referrer.referralCode}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Código: {referrer.referralCode}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <MousePointer className="h-3 w-3" />
                    </div>
                    <p className="font-medium">{referrer.totalClicks}</p>
                    <p className="text-xs text-muted-foreground">cliques</p>
                  </div>
                  <Badge variant={referrer.isActive ? 'default' : 'secondary'}>
                    {referrer.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
