-- Fix Security Definer Views: set to SECURITY INVOKER
ALTER VIEW public.elite_engine_analytics SET (security_invoker = on);
ALTER VIEW public.elite_engine_structure_distribution SET (security_invoker = on);
ALTER VIEW public.elite_engine_angle_distribution SET (security_invoker = on);
ALTER VIEW public.elite_engine_collision_rate SET (security_invoker = on);