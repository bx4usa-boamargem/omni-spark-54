import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface KeywordData {
  query?: string;
  key?: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface KeywordsTableProps {
  data: KeywordData[];
}

export function KeywordsTable({ data }: KeywordsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        Nenhuma palavra-chave encontrada no período selecionado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-gray-400">Palavra-chave</TableHead>
            <TableHead className="text-gray-400 text-right">Posição</TableHead>
            <TableHead className="text-gray-400 text-right">Cliques</TableHead>
            <TableHead className="text-gray-400 text-right">Impressões</TableHead>
            <TableHead className="text-gray-400 text-right">CTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => {
            const keyword = item.query || item.key || 'N/A';
            const positionColor = item.position <= 3 
              ? 'text-green-400' 
              : item.position <= 10 
                ? 'text-yellow-400' 
                : 'text-gray-400';

            return (
              <TableRow key={index} className="border-white/5 hover:bg-white/5">
                <TableCell className="text-white font-medium max-w-[200px] truncate">
                  {keyword}
                </TableCell>
                <TableCell className={`text-right ${positionColor}`}>
                  {item.position?.toFixed(1) || '-'}
                </TableCell>
                <TableCell className="text-right text-white">
                  {item.clicks?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-right text-gray-400">
                  {item.impressions?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-right text-gray-400">
                  {((item.ctr || 0) * 100).toFixed(2)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
