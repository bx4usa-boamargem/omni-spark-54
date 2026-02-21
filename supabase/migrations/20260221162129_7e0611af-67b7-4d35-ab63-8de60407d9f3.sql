
ALTER TABLE public.generation_steps
  ALTER COLUMN step_name TYPE text
  USING step_name::text;

CREATE INDEX IF NOT EXISTS idx_generation_steps_job_step
  ON public.generation_steps (job_id, step_name);

ALTER TABLE public.generation_steps
ADD CONSTRAINT generation_steps_step_name_valid
CHECK (
  step_name ~ '^[A-Z0-9_]+$'
);
