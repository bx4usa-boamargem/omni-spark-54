-- Inject data into articles
UPDATE public.articles 
SET view_count = trunc(random() * 500 + 1500) 
WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'
AND status = 'published';

-- Inject WhatsApp CTA Clicks
INSERT INTO public.real_leads (blog_id, lead_type, created_at, metadata)
SELECT 
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'whatsapp_click',
    now() - (random() * interval '7 days'),
    '{"source": "dashboard_mock_test"}'::jsonb
FROM generate_series(1, 24);

-- Inject Phone CTA Clicks
INSERT INTO public.real_leads (blog_id, lead_type, created_at, metadata)
SELECT 
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'phone_click',
    now() - (random() * interval '7 days'),
    '{"source": "dashboard_mock_test"}'::jsonb
FROM generate_series(1, 24);

-- Inject Real Form Leads
INSERT INTO public.real_leads (blog_id, lead_type, created_at, metadata)
SELECT 
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'form_submit',
    now() - (random() * interval '7 days'),
    jsonb_build_object(
        'name', 'Mock Lead ' || g.id,
        'phone', '551199999999',
        'email', 'lead' || g.id || '@test.com'
    )
FROM generate_series(1, 12) AS g(id);
