import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oxbrvyinmpbkllicaxqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YnJ2eWlubXBia2xsaWNheHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjYwMTMsImV4cCI6MjA4NzAwMjAxM30.ZLvQlsid_xhhMvRUB_kgsjBupl7WoTd8haPhdv8_Du0";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('generation_jobs')
        .select('error_message, status, article_id')
        .eq('id', '6aad3c4a-ae27-4aab-95f1-3a16bcc411db')
        .single();

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('--- JOB REPORT ---');
    console.log('Job Status:', data.status);
    console.log('Article ID:', data.article_id);
    console.log('Error Message:', data.error_message);
    console.log('------------------');
}

check();
