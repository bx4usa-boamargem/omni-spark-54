
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

const { data, error } = await supabase
    .from('generation_jobs')
    .select('id, status, error_message, public_message, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

if (error) {
    console.error("Error fetching jobs:", error);
} else {
    console.log(JSON.stringify(data, null, 2));
}
