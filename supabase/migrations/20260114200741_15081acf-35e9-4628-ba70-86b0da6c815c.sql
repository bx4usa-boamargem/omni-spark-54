-- Create help_faqs table for interactive FAQ section
CREATE TABLE IF NOT EXISTS public.help_faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_faqs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading published FAQs (public access)
CREATE POLICY "Anyone can read published FAQs" 
ON public.help_faqs 
FOR SELECT 
USING (is_published = true);

-- Create policy for updating helpful_count (authenticated users)
CREATE POLICY "Authenticated users can update helpful_count" 
ON public.help_faqs 
FOR UPDATE 
TO authenticated
USING (is_published = true)
WITH CHECK (is_published = true);

-- Insert initial FAQs
INSERT INTO public.help_faqs (question, answer, category, order_index, is_featured) VALUES
-- Conta & Acesso
('Como redefinir minha senha?', 'Para redefinir sua senha, clique em "Esqueci minha senha" na tela de login. Você receberá um e-mail com um link para criar uma nova senha. Se não receber o e-mail, verifique sua caixa de spam.', 'conta', 1, true),
('Como alterar meu e-mail de acesso?', 'Acesse Minha Conta > Perfil. No momento, a alteração de e-mail requer contato com o suporte para garantir a segurança da sua conta.', 'conta', 2, false),
('Como sair da minha conta?', 'Clique no botão "Sair da conta" no final da página Minha Conta. Você será redirecionado para a tela de login.', 'conta', 3, false),
('Como convidar membros para minha equipe?', 'Em Minha Conta > Equipe, digite o e-mail do colaborador e clique em "Convidar". Ele receberá um e-mail para aceitar o convite.', 'conta', 4, true),
('Como mudar minha foto de perfil?', 'Em Minha Conta > Meu Perfil, clique no ícone de câmera sobre sua foto atual. Você pode recortar e ajustar a imagem antes de salvar.', 'conta', 5, false),

-- Conteúdo
('Quanto tempo leva para gerar um artigo?', 'A geração de artigo leva entre 30 segundos e 2 minutos, dependendo do tamanho e complexidade. Você pode acompanhar o progresso em tempo real.', 'conteudo', 1, true),
('Posso editar artigos gerados pela IA?', 'Sim! Todos os artigos passam por uma fase de rascunho onde você pode editar título, conteúdo, imagens e SEO antes de publicar.', 'conteudo', 2, true),
('Como publicar um rascunho?', 'Abra o artigo em modo de edição e clique em "Publicar" no canto superior direito. O artigo ficará disponível imediatamente no seu blog.', 'conteudo', 3, false),
('Como agendar uma publicação?', 'No editor, clique em "Agendar" ao invés de "Publicar". Escolha a data e horário desejados. O sistema publicará automaticamente.', 'conteudo', 4, false),
('Como regenerar imagens de um artigo?', 'No editor, clique no ícone de regenerar ao lado de qualquer imagem. A IA criará uma nova imagem mantendo o contexto do artigo.', 'conteudo', 5, false),

-- Radar & SEO
('O que é o score de relevância do Radar?', 'O score (0-100) indica o potencial comercial de uma oportunidade. Scores 90+ significam alta demanda local com baixa concorrência - priorize esses temas!', 'radar', 1, true),
('Com que frequência o Radar é atualizado?', 'O Radar analisa o mercado semanalmente, identificando novas tendências e oportunidades baseadas em buscas reais na sua região e nicho.', 'radar', 2, true),
('Como melhorar meu score de SEO?', 'Acesse Análise de SEO para ver diagnósticos automáticos. Clique em "Otimizar meus artigos" para aplicar correções sugeridas com um clique.', 'radar', 3, false),
('O que significa "Aproveitamento do Radar"?', 'É a porcentagem de oportunidades que você converteu em artigos reais. Quanto maior, mais você está executando o plano estratégico da IA.', 'radar', 4, false),

-- Pagamentos
('Como cancelar minha assinatura?', 'Acesse Minha Conta > Seu Plano. Você encontrará a opção de cancelamento. Seu acesso continua até o fim do período pago.', 'pagamentos', 1, true),
('Como mudar de plano?', 'Em Minha Conta > Seu Plano, clique em "Upgrade" para ver opções disponíveis. A diferença é calculada proporcionalmente.', 'pagamentos', 2, false),
('Posso solicitar reembolso?', 'Oferecemos reembolso integral nos primeiros 7 dias. Após esse período, entre em contato com o suporte para avaliar seu caso.', 'pagamentos', 3, false),
('O teste grátis precisa de cartão?', 'Não! O teste de 7 dias é 100% gratuito e não requer cartão de crédito. Você decide se quer continuar após experimentar.', 'pagamentos', 4, true),

-- Técnico
('Meu blog está lento, o que fazer?', 'Verifique se você tem muitas imagens pesadas. O sistema otimiza automaticamente, mas imagens externas podem impactar a velocidade.', 'tecnico', 1, false),
('Como funciona o domínio customizado?', 'Em Minha Conta > Domínio Personalizado, siga as instruções para configurar seu DNS. O SSL é gratuito e ativado automaticamente.', 'tecnico', 2, true),
('Posso ter múltiplos blogs?', 'Sim! O plano Business permite até 5 blogs. Cada blog tem configurações independentes mas compartilha a mesma conta.', 'tecnico', 3, false),
('Como conectar o Google Search Console?', 'Acesse Integrações > Google Search Console. Siga o passo a passo para autorizar a conexão. Os dados sincronizam em até 24h.', 'tecnico', 4, true);