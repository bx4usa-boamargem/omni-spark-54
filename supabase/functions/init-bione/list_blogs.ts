import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

async function listAllBlogs() {
    console.log("--- LISTING ALL BLOGS ---");
    const { data: blogs, error } = await supabase.from('blogs').select('id, name, city');
    if (error) {
        console.error("Error listing blogs:", error);
        return;
    }
    console.log(JSON.stringify(blogs, null, 2));

    console.log("\n--- LISTING RECENT NICHES ---");
    const { data: niches, error: nicheError } = await supabase.from('niche_profiles').select('id, name, description');
    if (nicheError) {
        console.error("Error listing niches:", nicheError);
    } else {
        console.log(JSON.stringify(niches, null, 2));
    }
}

listAllBlogs();
