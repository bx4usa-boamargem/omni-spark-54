import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const client = new Client("postgresql://postgres:Bionesupa2026%40@db.leouwdcodvfyjpgczwsr.supabase.co:5432/postgres");

async function run() {
  await client.connect();
  console.log("Connected.");
  
  const files = [
    "20260301_radar_v3_tables.sql",
    "20260302_radar_v3_schema_fix.sql"
  ];
  
  for (const file of files) {
    console.log(`Running ${file}...`);
    const sql = await Deno.readTextFile(`./supabase/migrations/${file}`);
    await client.queryArray(sql);
  }
  
  await client.end();
  console.log("Completado com sucesso.");
}

run();
