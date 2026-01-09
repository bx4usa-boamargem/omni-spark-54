import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GSCDataPoint {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCAggregated {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

export interface GSCAnalyticsResult {
  success: boolean;
  connected: boolean;
  siteUrl?: string;
  dimension: string;
  dateRange: { start: string; end: string };
  data: GSCDataPoint[];
  aggregated: GSCAggregated;
}

export interface PeriodComparison {
  current: GSCAggregated;
  previous: GSCAggregated;
  changes: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export function useGSCAnalytics(blogId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (
    dimension: "date" | "page" | "query" = "date",
    startDate?: string,
    endDate?: string,
    rowLimit?: number
  ): Promise<GSCAnalyticsResult | null> => {
    if (!blogId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke(
        "fetch-gsc-analytics",
        {
          body: {
            blogId,
            dimension,
            startDate,
            endDate,
            rowLimit: rowLimit || 100,
          },
        }
      );

      if (fetchError) throw fetchError;
      if (data.error) throw new Error(data.error);

      return data as GSCAnalyticsResult;
    } catch (err) {
      console.error("Error fetching GSC analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [blogId]);

  const fetchPeriodComparison = useCallback(async (
    days: number = 28
  ): Promise<PeriodComparison | null> => {
    if (!blogId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const currentEnd = now.toISOString().split("T")[0];
      const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Fetch current period
      const { data: currentData, error: currentError } = await supabase.functions.invoke(
        "fetch-gsc-analytics",
        {
          body: {
            blogId,
            dimension: "date",
            startDate: currentStart,
            endDate: currentEnd,
          },
        }
      );

      if (currentError) throw currentError;

      // Fetch previous period
      const { data: previousData, error: previousError } = await supabase.functions.invoke(
        "fetch-gsc-analytics",
        {
          body: {
            blogId,
            dimension: "date",
            startDate: previousStart,
            endDate: currentStart,
          },
        }
      );

      if (previousError) throw previousError;

      const current = currentData.aggregated as GSCAggregated;
      const previous = previousData.aggregated as GSCAggregated;

      const calcChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      return {
        current,
        previous,
        changes: {
          clicks: calcChange(current.totalClicks, previous.totalClicks),
          impressions: calcChange(current.totalImpressions, previous.totalImpressions),
          ctr: Math.round((current.avgCtr - previous.avgCtr) * 100) / 100,
          position: Math.round((previous.avgPosition - current.avgPosition) * 100) / 100, // Positive is improvement
        },
      };
    } catch (err) {
      console.error("Error fetching period comparison:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch comparison");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [blogId]);

  const fetchHistoricalData = useCallback(async (
    days: number = 28
  ): Promise<GSCDataPoint[] | null> => {
    if (!blogId) return null;

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const { data, error: fetchError } = await supabase
        .from("gsc_analytics_history")
        .select("date, clicks, impressions, ctr, position")
        .eq("blog_id", blogId)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      return (data || []).map((d) => ({
        key: d.date,
        clicks: d.clicks || 0,
        impressions: d.impressions || 0,
        ctr: Number(d.ctr) || 0,
        position: Number(d.position) || 0,
      }));
    } catch (err) {
      console.error("Error fetching historical data:", err);
      return null;
    }
  }, [blogId]);

  const fetchTopQueries = useCallback(async (
    limit: number = 10
  ): Promise<GSCDataPoint[] | null> => {
    if (!blogId) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from("gsc_queries_history")
        .select("query, clicks, impressions, ctr, position")
        .eq("blog_id", blogId)
        .order("clicks", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      return (data || []).map((d) => ({
        key: d.query,
        clicks: d.clicks || 0,
        impressions: d.impressions || 0,
        ctr: Number(d.ctr) || 0,
        position: Number(d.position) || 0,
      }));
    } catch (err) {
      console.error("Error fetching top queries:", err);
      return null;
    }
  }, [blogId]);

  const fetchTopPages = useCallback(async (
    limit: number = 10
  ): Promise<GSCDataPoint[] | null> => {
    if (!blogId) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from("gsc_pages_history")
        .select("page_url, clicks, impressions, ctr, position")
        .eq("blog_id", blogId)
        .order("clicks", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      return (data || []).map((d) => ({
        key: d.page_url,
        clicks: d.clicks || 0,
        impressions: d.impressions || 0,
        ctr: Number(d.ctr) || 0,
        position: Number(d.position) || 0,
      }));
    } catch (err) {
      console.error("Error fetching top pages:", err);
      return null;
    }
  }, [blogId]);

  return {
    isLoading,
    error,
    fetchAnalytics,
    fetchPeriodComparison,
    fetchHistoricalData,
    fetchTopQueries,
    fetchTopPages,
  };
}
