import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataPoint {
  date?: string;
  clicks: number;
  impressions: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      dateFormatted: item.date 
        ? format(new Date(item.date), 'dd/MM', { locale: ptBR })
        : ''
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Sem dados para exibir no período selecionado
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          
          <XAxis 
            dataKey="dateFormatted" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'clicks' ? 'Cliques' : 'Impressões'
            ]}
            labelFormatter={(label) => `Data: ${label}`}
          />
          
          <Legend 
            formatter={(value) => value === 'clicks' ? 'Cliques' : 'Impressões'}
            wrapperStyle={{ color: '#9CA3AF' }}
          />
          
          <Area 
            type="monotone" 
            dataKey="clicks" 
            stroke="#3B82F6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorClicks)" 
          />
          
          <Area 
            type="monotone" 
            dataKey="impressions" 
            stroke="#EC4899" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorImpressions)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
