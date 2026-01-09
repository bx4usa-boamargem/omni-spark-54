import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, FileText, Image } from "lucide-react";

interface UsageData {
  articles_generated: number;
  articles_limit: number;
  images_generated: number;
}

interface UsageTrackerProps {
  userId: string;
}

export function UsageTracker({ userId }: UsageTrackerProps) {
  const [usage, setUsage] = useState<UsageData>({
    articles_generated: 0,
    articles_limit: 30,
    images_generated: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        
        const { data, error } = await supabase
          .from("usage_tracking")
          .select("*")
          .eq("user_id", userId)
          .eq("month", currentMonth)
          .single();

        if (data) {
          setUsage(data);
        }
      } catch (error) {
        console.error("Error fetching usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [userId]);

  const usagePercentage = (usage.articles_generated / usage.articles_limit) * 100;
  const estimatedCost = usage.articles_generated * 0.40; // Average cost

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Uso do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Artigos gerados
            </span>
            <span className="font-medium">
              {usage.articles_generated} / {usage.articles_limit}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          {usagePercentage >= 80 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Você está próximo do limite mensal
            </p>
          )}
        </div>

        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <Image className="h-4 w-4" />
            Imagens geradas
          </span>
          <span className="font-medium">{usage.images_generated}</span>
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span>Custo estimado:</span>
            <span className="font-bold text-primary">
              ~R$ {estimatedCost.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
