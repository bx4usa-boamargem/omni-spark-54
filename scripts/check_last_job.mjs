import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
// Use ONLY service_role_key to bypass RLS
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
    console.log("No service role key found. Run this with SUPABASE_SERVICE_ROLE_KEY set.");
    process.exit(1);
}

async function run() {
    console.log("=== Lendo Jobs Globais ===");
    try {
        const jobsRes = await fetch(`${supabaseUrl}/rest/v1/generation_jobs?select=id,status,article_id,blog_id,created_at,error_message&order=created_at.desc&limit=3`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const jobs = await jobsRes.json();
        if (jobs && jobs.length > 0) {
            console.log("Last 3 Jobs:");
            console.log(JSON.stringify(jobs, null, 2));

            // Pega os steps do mais recente
            const stepsRes = await fetch(`${supabaseUrl}/rest/v1/generation_steps?select=step_name,status,error_message&job_id=eq.${jobs[0].id}&order=started_at.asc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            const steps = await stepsRes.json();
            console.log("\nSteps do job 0:", JSON.stringify(steps, null, 2));
        } else {
            console.log("Nenhum job encontrado ou erro na request.", jobs);
        }
    } catch (err) {
        console.error("Erro na leitura:", err);
    }
}

run();
