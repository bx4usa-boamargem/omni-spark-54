import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const result = {
    auth_mode: "ANON_KEY (RLS APPLIES)",
    notes: "If items are missing, RLS blocked access (e.g., drafts/staged)."
  };

  // 1. Blogs
  const { data: blogs, error: e1 } = await supabase.from('blogs').select('id, slug, platform_subdomain, status').eq('id', '44c4f7cd-05b0-4229-9828-2eb822d38bfd');
  result.blogs = blogs || (e1 ? `ERROR: ${e1.message}` : []);

  // 2. Articles
  const { data: articles, error: e2 } = await supabase.from('articles').select('id, slug, title, status, blog_id, created_at, featured_image_url').eq('blog_id', '44c4f7cd-05b0-4229-9828-2eb822d38bfd');
  result.articles = articles || (e2 ? `ERROR: ${e2.message}` : []);

  // 3. Cluster
  const { data: clusters, error: e3 } = await supabase.from('content_clusters').select('id, name, status, blog_id').eq('id', '941159f4-8ff8-4c70-b39f-8eec0b453c45');
  result.clusters = clusters || (e3 ? `ERROR: ${e3.message}` : []);

  // 4. Storage Info
  const { data: files, error: e4 } = await supabase.storage.from('article-images').list('44c4f7cd-05b0-4229-9828-2eb822d38bfd');
  result.storage_files = files || (e4 ? `ERROR: ${e4.message}` : []);

  console.log(JSON.stringify(result, null, 2));
}

run().catch(err => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
