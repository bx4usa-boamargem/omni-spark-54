
ALTER TABLE public.article_opportunities 
ADD COLUMN IF NOT EXISTS generation_job_id uuid REFERENCES public.generation_jobs(id);
