// BUG-14 fix: restringir CORS por env var em produção
// Em produção: definir ALLOWED_ORIGIN nos secrets do Supabase
// Ex: supabase secrets set ALLOWED_ORIGIN=https://app.omniseen.com.br
const _allowedOrigin = (() => {
  try {
    return Deno.env.get('ALLOWED_ORIGIN') ?? '*';
  } catch {
    return '*';
  }
})();

export const corsHeaders = {
  'Access-Control-Allow-Origin': _allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

