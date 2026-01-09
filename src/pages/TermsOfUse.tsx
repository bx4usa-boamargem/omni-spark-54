import { Link } from "react-router-dom";
import { OmniseenLogoHeader } from "@/components/ui/OmniseenLogoHeader";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma OMNISEEN ("Serviço"), você concorda em cumprir e estar vinculado a estes Termos de Uso ("Termos"). 
              Se você não concordar com qualquer parte destes Termos, não poderá acessar ou utilizar o Serviço.
            </p>
            <p>
              Estes Termos constituem um contrato legalmente vinculativo entre você ("Usuário", "você") e OMNISEEN ("Empresa", "nós", "nosso").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p>
              A OMNISEEN é uma plataforma SaaS (Software as a Service) de automação de blogs com inteligência artificial que permite:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criação automatizada de artigos otimizados para SEO</li>
              <li>Gerenciamento de blogs e conteúdo</li>
              <li>Análise de palavras-chave e concorrentes</li>
              <li>Publicação automática e agendamento de conteúdo</li>
              <li>Geração de imagens com inteligência artificial</li>
              <li>Integração com domínios personalizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Elegibilidade</h2>
            <p>
              Para usar o Serviço, você deve ter pelo menos 18 anos de idade e capacidade legal para celebrar contratos vinculativos. 
              Ao usar o Serviço, você declara e garante que atende a esses requisitos.
            </p>
            <p>
              Em conformidade com a Lei de Proteção à Privacidade Online das Crianças (COPPA) dos Estados Unidos, 
              não coletamos intencionalmente informações de menores de 13 anos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Cadastro e Conta do Usuário</h2>
            <p>
              Para acessar determinadas funcionalidades do Serviço, você deverá criar uma conta fornecendo informações precisas, 
              completas e atualizadas. Você é responsável por:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Manter a confidencialidade de suas credenciais de acesso</li>
              <li>Todas as atividades realizadas em sua conta</li>
              <li>Notificar imediatamente qualquer uso não autorizado de sua conta</li>
              <li>Manter suas informações de cadastro atualizadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Planos e Pagamentos</h2>
            <p>
              O Serviço oferece diferentes planos de assinatura (Lite, Pro, Business) com funcionalidades e limites específicos.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Período de Teste:</strong> Oferecemos 7 dias de teste gratuito para novos usuários</li>
              <li><strong>Cobrança:</strong> As assinaturas são cobradas mensalmente ou anualmente, conforme escolha do usuário</li>
              <li><strong>Renovação Automática:</strong> As assinaturas são renovadas automaticamente, salvo cancelamento prévio</li>
              <li><strong>Processamento de Pagamentos:</strong> Utilizamos o Stripe como processador de pagamentos. Ao fornecer informações de pagamento, você concorda com os termos de serviço do Stripe</li>
              <li><strong>Reembolsos:</strong> Reembolsos podem ser solicitados dentro de 7 dias após a cobrança, sujeitos a análise</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Propriedade Intelectual</h2>
            <h3 className="text-lg font-medium mb-2">6.1 Conteúdo Gerado pelo Usuário</h3>
            <p>
              O conteúdo gerado através do Serviço, incluindo artigos criados com IA, pertence ao Usuário. 
              Você nos concede uma licença limitada para processar e armazenar esse conteúdo apenas para fins de prestação do Serviço.
            </p>
            <h3 className="text-lg font-medium mb-2 mt-4">6.2 Propriedade da Plataforma</h3>
            <p>
              A plataforma OMNISEEN, incluindo seu software, design, logotipos, marcas registradas e todo o conteúdo original, 
              são de propriedade exclusiva da Empresa e estão protegidos por leis de propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Uso Aceitável</h2>
            <p>Você concorda em NÃO utilizar o Serviço para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criar, distribuir ou promover conteúdo ilegal, difamatório, obsceno ou que viole direitos de terceiros</li>
              <li>Gerar spam, phishing ou qualquer forma de comunicação não solicitada em massa</li>
              <li>Violar leis aplicáveis, incluindo leis de proteção de dados e propriedade intelectual</li>
              <li>Interferir ou prejudicar o funcionamento do Serviço ou seus servidores</li>
              <li>Tentar acessar áreas restritas do sistema sem autorização</li>
              <li>Revender ou sublicenciar o acesso ao Serviço sem autorização expressa</li>
              <li>Criar conteúdo que promova ódio, discriminação ou violência</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Limitação de Responsabilidade</h2>
            <p>
              NA MÁXIMA EXTENSÃO PERMITIDA POR LEI, A OMNISEEN NÃO SERÁ RESPONSÁVEL POR:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Danos indiretos, incidentais, especiais, consequenciais ou punitivos</li>
              <li>Perda de lucros, receitas, dados ou oportunidades de negócios</li>
              <li>Conteúdo gerado por IA que possa conter imprecisões</li>
              <li>Interrupções temporárias do Serviço para manutenção</li>
              <li>Ações de terceiros que utilizem informações obtidas através do Serviço</li>
            </ul>
            <p className="mt-4">
              Em nenhuma circunstância nossa responsabilidade total excederá o valor pago pelo Usuário nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Indenização</h2>
            <p>
              Você concorda em indenizar, defender e isentar a OMNISEEN, seus diretores, funcionários e agentes de qualquer 
              reclamação, dano, perda ou despesa (incluindo honorários advocatícios) decorrentes de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Seu uso do Serviço</li>
              <li>Violação destes Termos</li>
              <li>Violação de direitos de terceiros</li>
              <li>Conteúdo que você criar ou publicar através do Serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Modificações dos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor 
              imediatamente após a publicação dos Termos atualizados. O uso continuado do Serviço após tais alterações 
              constitui sua aceitação dos novos Termos.
            </p>
            <p>
              Notificaremos os usuários sobre alterações materiais através de email ou aviso na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar seu acesso ao Serviço, a nosso critério exclusivo, por qualquer motivo, 
              incluindo violação destes Termos. Você pode cancelar sua conta a qualquer momento através das configurações 
              da plataforma.
            </p>
            <p>
              Após a rescisão, seu direito de usar o Serviço cessará imediatamente. As disposições que, por sua natureza, 
              devam sobreviver à rescisão, permanecerão em vigor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Lei Aplicável e Jurisdição</h2>
            <p>
              Estes Termos serão regidos e interpretados de acordo com as leis do Estado de Delaware, Estados Unidos, 
              sem considerar seus conflitos de disposições legais.
            </p>
            <p className="mt-4">
              <strong>Para usuários brasileiros:</strong> Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) 
              e o Marco Civil da Internet (Lei nº 12.965/2014), reconhecemos e respeitamos os direitos dos titulares de dados 
              residentes no Brasil, incluindo o direito de acesso, correção, exclusão e portabilidade de dados pessoais.
            </p>
            <p className="mt-4">
              Qualquer disputa decorrente destes Termos será resolvida exclusivamente nos tribunais estaduais ou federais 
              localizados em Delaware, EUA, e você consente com a jurisdição pessoal de tais tribunais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">13. Disposições Gerais</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acordo Integral:</strong> Estes Termos constituem o acordo completo entre você e a OMNISEEN</li>
              <li><strong>Renúncia:</strong> A falha em exercer qualquer direito não constitui renúncia a esse direito</li>
              <li><strong>Divisibilidade:</strong> Se qualquer disposição for considerada inválida, as demais permanecerão em vigor</li>
              <li><strong>Cessão:</strong> Você não pode ceder seus direitos sem nosso consentimento prévio por escrito</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">14. Contato</h2>
            <p>
              Para questões relacionadas a estes Termos de Uso, entre em contato conosco:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> legal@omniseen.com</li>
              <li><strong>Suporte:</strong> support@omniseen.com</li>
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
