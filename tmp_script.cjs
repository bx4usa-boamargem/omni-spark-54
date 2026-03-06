require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Verificando se as env keys estão definidas:
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error("VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY faltando no arquivo .env");
  process.exit(1);
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.from('blogs').select('*').limit(10);
  console.log(JSON.stringify({ data, error }, null, 2));
}
run();
