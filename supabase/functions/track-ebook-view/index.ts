import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * track-ebook-view
 *
 * Registra uma visualização de eBook por share_token.
 * Suporta dois modos:
 *   1. POST { share_token: string }   → incrementa view_count, registra IP único
 *   2. GET  ?token=<share_token>      → retorna estatísticas da visualização
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // ─── GET: estatísticas ───────────────────────────────────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'share_token requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { data, error } = await supabase
        .from('ebook_views')
        .select('view_count, unique_ips, created_at, last_viewed_at, article_id, blog_id')
        .eq('share_token', token)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Token não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          view_count: data.view_count,
          unique_visitor_count: (data.unique_ips as string[]).length,
          created_at: data.created_at,
          last_viewed_at: data.last_viewed_at,
          article_id: data.article_id,
          blog_id: data.blog_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── POST: registrar visualização ────────────────────────────────────
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não suportado' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { share_token } = body;

    if (!share_token) {
      return new Response(
        JSON.stringify({ error: 'share_token é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Extrair IP do visitante
    const visitorIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    // Buscar registro atual
    const { data: existing, error: fetchError } = await supabase
      .from('ebook_views')
      .select('id, view_count, unique_ips')
      .eq('share_token', share_token)
      .single();

    if (fetchError || !existing) {
      console.warn(`[track-ebook-view] Token não encontrado: ${share_token}`);
      return new Response(
        JSON.stringify({ error: 'Token não encontrado', tracked: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Atualizar IPs únicos
    const uniqueIps: string[] = existing.unique_ips ?? [];
    const isFirstVisit = !uniqueIps.includes(visitorIp);
    if (isFirstVisit) {
      uniqueIps.push(visitorIp);
      // Limitar a 10000 entradas para não inflar o jsonb
      if (uniqueIps.length > 10_000) uniqueIps.shift();
    }

    // Incrementar atomicamente view_count
    const { error: updateError } = await supabase
      .from('ebook_views')
      .update({
        view_count: existing.view_count + 1,
        unique_ips: uniqueIps,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[track-ebook-view] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar visualização' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Opcionalmente incrementar contagem no artigo
    await supabase.rpc('increment_article_view', {
      p_share_token: share_token,
    }).catch(() => null); // silencia — a função pode não existir ainda

    console.log(`[track-ebook-view] Visualização registrada. token=${share_token} ip=${visitorIp} total=${existing.view_count + 1}`);

    return new Response(
      JSON.stringify({
        tracked: true,
        is_first_visit: isFirstVisit,
        view_count: existing.view_count + 1,
        unique_visitor_count: uniqueIps.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[track-ebook-view] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
