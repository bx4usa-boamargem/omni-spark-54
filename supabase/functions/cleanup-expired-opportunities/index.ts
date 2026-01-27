import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[cleanup-expired-opportunities] Starting cleanup...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`[cleanup] Deleting opportunities older than: ${cutoffDate}`);

    // Delete expired opportunities that are NOT converted (preserve ROI history)
    // Status that can be deleted: pending, approved, archived
    const { data: deleted, error } = await supabase
      .from('article_opportunities')
      .delete()
      .lt('created_at', cutoffDate)
      .neq('status', 'converted')
      .select('id, blog_id, suggested_title, status, created_at');

    if (error) {
      console.error('[cleanup] Error deleting opportunities:', error);
      throw error;
    }

    const deletedCount = deleted?.length || 0;
    console.log(`[cleanup] Successfully deleted ${deletedCount} expired opportunities`);

    // Log summary by blog if there were deletions
    if (deleted && deleted.length > 0) {
      const blogCounts: Record<string, number> = {};
      deleted.forEach(opp => {
        blogCounts[opp.blog_id] = (blogCounts[opp.blog_id] || 0) + 1;
      });
      console.log('[cleanup] Deletions by blog:', blogCounts);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedCount,
        cutoff_date: cutoffDate,
        message: `Cleaned up ${deletedCount} expired opportunities (older than 30 days)`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[cleanup] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
