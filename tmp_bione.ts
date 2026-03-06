import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data } = await supabase.from('blogs').select('*').limit(10);
  console.log(data);
}
run();
