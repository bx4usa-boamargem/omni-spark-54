import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2, TrendingUp, Globe, Users, Share2, Mail, Search } from 'lucide-react';

interface ChannelData {
  name: string;
  value: number;
  percentage: number;
  icon: React.ElementType;
  color: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  organic: { label: 'Orgânico', icon: Search, color: '#22c55e' },
  referral: { label: 'Indicação', icon: Share2, color: '#8b5cf6' },
  social: { label: 'Redes Sociais', icon: Globe, color: '#3b82f6' },
  direct: { label: 'Direto', icon: Users, color: '#f59e0b' },
  email: { label: 'Email', icon: Mail, color: '#ef4444' },
  other: { label: 'Outros', icon: TrendingUp, color: '#6b7280' },
};

export function AcquisitionChannelsCard() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchChannelData();
  }, []);

  const fetchChannelData = async () => {
    try {
      // Fetch profiles with referral_source
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('referral_source');

      if (error) throw error;

      // Group by source
      const sourceCounts: Record<string, number> = {};
      (profiles || []).forEach((p) => {
        const source = normalizeSource(p.referral_source);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const total = profiles?.length || 0;
      setTotalUsers(total);

      // Convert to chart data
      const chartData: ChannelData[] = Object.entries(sourceCounts)
        .map(([key, value]) => {
          const config = CHANNEL_CONFIG[key] || CHANNEL_CONFIG.other;
          return {
            name: config.label,
            value,
            percentage: total > 0 ? (value / total) * 100 : 0,
            icon: config.icon,
            color: config.color,
          };
        })
        .sort((a, b) => b.value - a.value);

      setChannels(chartData);
    } catch (error) {
      console.error('Error fetching channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeSource = (source: string | null): string => {
    if (!source) return 'direct';
    const s = source.toLowerCase();
    
    if (s.includes('google') || s.includes('organic') || s.includes('search')) return 'organic';
    if (s.includes('referral') || s.includes('indicação') || s.includes('indicacao')) return 'referral';
    if (s.includes('facebook') || s.includes('instagram') || s.includes('twitter') || s.includes('linkedin') || s.includes('social')) return 'social';
    if (s.includes('email') || s.includes('newsletter')) return 'email';
    if (s.includes('direct') || s === '') return 'direct';
    
    return 'other';
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
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Canais de Aquisição
        </CardTitle>
        <CardDescription>
          De onde vêm seus {totalUsers} usuários
        </CardDescription>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado de aquisição disponível
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channels}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {channels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Usuários']}
                    contentStyle={{ 
                      background: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {channels.map((channel, index) => {
                const Icon = channel.icon;
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: channel.color }}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{channel.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {channel.value} usuários
                      </span>
                      <span className="text-sm font-medium w-12 text-right">
                        {channel.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
