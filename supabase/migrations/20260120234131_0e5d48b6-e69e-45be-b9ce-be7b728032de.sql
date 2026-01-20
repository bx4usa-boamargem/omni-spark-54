-- Add PDF fields to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.articles.pdf_url IS 'URL pública do PDF gerado do artigo';
COMMENT ON COLUMN public.articles.pdf_generated_at IS 'Data/hora da última geração do PDF';

-- Create storage bucket for article PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-pdfs', 'article-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access
CREATE POLICY "PDFs de artigos são públicos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'article-pdfs');

-- Policy for authenticated users to upload PDFs
CREATE POLICY "Usuários autenticados podem fazer upload de PDFs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-pdfs');

-- Policy for authenticated users to update PDFs
CREATE POLICY "Usuários autenticados podem atualizar PDFs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'article-pdfs');

-- Policy for authenticated users to delete PDFs
CREATE POLICY "Usuários autenticados podem deletar PDFs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'article-pdfs');