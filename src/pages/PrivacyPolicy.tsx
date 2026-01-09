import { Link } from "react-router-dom";
import { OmniseenLogoHeader } from "@/components/ui/OmniseenLogoHeader";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 py-4">
        <div className="container flex items-center justify-between">
          <Link to="/">
            <OmniseenLogoHeader />
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introdução</h2>
            <p>
              A OMNISEEN ("Empresa", "nós", "nosso") está comprometida em proteger sua privacidade. Esta Política de Privacidade 
              explica como coletamos, usamos, divulgamos e protegemos suas informações quando você utiliza nossa plataforma.
            </p>
            <p>
              Esta política foi elaborada em conformidade com:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Estados Unidos:</strong> California Consumer Privacy Act (CCPA), CAN-SPAM Act, Children's Online Privacy Protection Act (COPPA)</li>
              <li><strong>Brasil:</strong> Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), Marco Civil da Internet (Lei nº 12.965/2014)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Dados que Coletamos</h2>
            
            <h3 className="text-lg font-medium mb-2">2.1 Informações de Cadastro</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nome completo</li>
              <li>Endereço de email</li>
              <li>Informações de pagamento (processadas pelo Stripe)</li>
              <li>Informações da empresa (opcional)</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">2.2 Dados de Uso da Plataforma</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Artigos criados e conteúdo gerado</li>
              <li>Configurações de blog e preferências</li>
              <li>Palavras-chave e estratégias de SEO</li>
              <li>Métricas de desempenho e analytics</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">2.3 Dados Técnicos</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Endereço IP</li>
              <li>Tipo de navegador e dispositivo</li>
              <li>Sistema operacional</li>
              <li>Páginas visitadas e tempo de navegação</li>
              <li>Logs de acesso (conforme Marco Civil da Internet)</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">2.4 Cookies e Tecnologias Similares</h3>
            <p>
              Utilizamos cookies essenciais para funcionamento da plataforma, cookies de análise para melhorar nossos serviços, 
              e cookies de preferência para lembrar suas configurações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Base Legal para Processamento (LGPD)</h2>
            <p>Processamos seus dados pessoais com base nas seguintes bases legais:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Execução de Contrato:</strong> Para fornecer nossos serviços conforme contratado</li>
              <li><strong>Consentimento:</strong> Para comunicações de marketing e cookies não essenciais</li>
              <li><strong>Interesse Legítimo:</strong> Para melhorar nossos serviços e prevenir fraudes</li>
              <li><strong>Obrigação Legal:</strong> Para cumprir requisitos legais e regulatórios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Como Usamos suas Informações</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer, operar e manter o Serviço</li>
              <li>Processar transações e gerenciar assinaturas</li>
              <li>Enviar comunicações relacionadas ao serviço</li>
              <li>Melhorar e personalizar sua experiência</li>
              <li>Analisar uso e tendências para melhorar o Serviço</li>
              <li>Prevenir fraudes e garantir segurança</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Compartilhamento de Dados</h2>
            <p>Podemos compartilhar suas informações com:</p>
            
            <h3 className="text-lg font-medium mb-2 mt-4">5.1 Processadores de Pagamento</h3>
            <p>
              Utilizamos o <strong>Stripe</strong> para processar pagamentos. O Stripe possui certificação PCI DSS Level 1 
              e sua política de privacidade está disponível em stripe.com/privacy.
            </p>

            <h3 className="text-lg font-medium mb-2 mt-4">5.2 Provedores de Inteligência Artificial</h3>
            <p>
              Para gerar conteúdo, utilizamos APIs de provedores de IA como OpenAI e Google. 
              Os dados enviados são utilizados exclusivamente para geração de conteúdo solicitado.
            </p>

            <h3 className="text-lg font-medium mb-2 mt-4">5.3 Infraestrutura Cloud</h3>
            <p>
              Nossos dados são armazenados em infraestrutura segura (Lovable Cloud/Supabase) com criptografia 
              em trânsito e em repouso.
            </p>

            <h3 className="text-lg font-medium mb-2 mt-4">5.4 Requisitos Legais</h3>
            <p>
              Podemos divulgar informações quando exigido por lei, ordem judicial ou para proteger nossos direitos legais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Transferência Internacional de Dados</h2>
            <p>
              Seus dados podem ser transferidos e processados em servidores localizados nos Estados Unidos. 
              Ao usar nosso Serviço, você consente com essa transferência.
            </p>
            <p className="mt-4">
              Para usuários brasileiros, garantimos que as transferências internacionais cumprem os requisitos da LGPD, 
              incluindo a adoção de cláusulas contratuais padrão quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Seus Direitos</h2>
            
            <h3 className="text-lg font-medium mb-2">7.1 Direitos sob a LGPD (Brasil)</h3>
            <p>Se você é residente no Brasil, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Confirmação da existência de tratamento de dados</li>
              <li>Acesso aos seus dados pessoais</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados</li>
              <li>Eliminação dos dados tratados com consentimento</li>
              <li>Informação sobre compartilhamento de dados</li>
              <li>Revogação do consentimento</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">7.2 Direitos sob a CCPA (Califórnia, EUA)</h3>
            <p>Se você é residente na Califórnia, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Saber quais informações pessoais coletamos</li>
              <li>Solicitar exclusão de suas informações pessoais</li>
              <li>Optar por não ter suas informações vendidas (não vendemos dados)</li>
              <li>Não ser discriminado por exercer seus direitos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Segurança dos Dados</h2>
            <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia SSL/TLS para todas as comunicações</li>
              <li>Criptografia de dados em repouso</li>
              <li>Controle de acesso baseado em funções</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares</li>
              <li>Autenticação segura</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Retenção de Dados</h2>
            <p>
              Retemos seus dados pessoais enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços. 
              Após o encerramento da conta:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dados de conta são excluídos em até 30 dias</li>
              <li>Logs de acesso são mantidos por 6 meses (conforme Marco Civil da Internet)</li>
              <li>Dados de faturamento são mantidos conforme exigências fiscais (5 anos)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Privacidade de Menores</h2>
            <p>
              Em conformidade com a COPPA, nosso Serviço não é destinado a menores de 13 anos. 
              Não coletamos intencionalmente informações pessoais de menores de 13 anos.
            </p>
            <p className="mt-4">
              Para uso da plataforma, o usuário deve ter pelo menos 18 anos de idade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Comunicações por Email (CAN-SPAM)</h2>
            <p>Em conformidade com o CAN-SPAM Act:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Identificamos claramente nossas mensagens como publicidade quando aplicável</li>
              <li>Incluímos nosso endereço físico em comunicações comerciais</li>
              <li>Oferecemos opção de cancelamento de inscrição em todos os emails</li>
              <li>Processamos solicitações de cancelamento em até 10 dias úteis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações materiais 
              através de email ou aviso na plataforma. A data de "última atualização" no topo desta página indica 
              quando a política foi revisada pela última vez.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">13. Encarregado de Proteção de Dados (DPO)</h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados pessoais, 
              entre em contato com nosso Encarregado de Proteção de Dados:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> dpo@omniseen.com</li>
              <li><strong>Privacidade:</strong> privacy@omniseen.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">14. Contato</h2>
            <p>
              Para questões relacionadas a esta Política de Privacidade, entre em contato conosco:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email Geral:</strong> legal@omniseen.com</li>
              <li><strong>Suporte:</strong> support@omniseen.com</li>
              <li><strong>Privacidade:</strong> privacy@omniseen.com</li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} OMNISEEN. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
