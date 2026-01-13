// Contrato Editorial Obrigatório - CTA Padrão por Nicho
// Este arquivo define o CTA obrigatório que DEVE estar em TODOS os artigos
// CTAs são personalizados por nicho da empresa - NUNCA genéricos sobre "automação"

export interface CompanyInfo {
  name: string;
  city?: string;
  whatsapp?: string;
  niche?: string;     // Para detectar tipo de conclusão
  services?: string;  // Backup para detecção de nicho
}

// Tipos de conclusão baseados no nicho
type ConclusionType = 'pragas' | 'advocacia' | 'clinica' | 'imobiliaria' | 'consultoria' | 'educacao' | 'alimentacao' | 'beleza' | 'construcao' | 'tecnologia' | 'financeiro' | 'default';

interface ConclusionTemplate {
  intro: string;
  action: string;
}

// Templates por tipo de negócio - profissionais e específicos
const CONCLUSION_TEMPLATES: Record<ConclusionType, ConclusionTemplate> = {
  pragas: {
    intro: "Você não precisa conviver com pragas na sua casa ou empresa. Esse problema tem solução rápida e segura.",
    action: "inspeção gratuita"
  },
  advocacia: {
    intro: "Se você precisa de orientação jurídica sobre este assunto, não deixe para depois. Quanto antes agir, melhores suas chances.",
    action: "consulta"
  },
  clinica: {
    intro: "Cuidar da saúde não pode esperar. Um diagnóstico precoce faz toda a diferença no tratamento.",
    action: "avaliação"
  },
  imobiliaria: {
    intro: "Quer saber o valor real do seu imóvel ou encontrar a propriedade ideal para você? O mercado está em movimento.",
    action: "avaliação gratuita"
  },
  consultoria: {
    intro: "Se você quer resolver esse desafio de forma profissional, o próximo passo é conversar com quem entende do assunto.",
    action: "conversa estratégica"
  },
  educacao: {
    intro: "Investir em educação é investir no futuro. O momento de começar é agora.",
    action: "matrícula"
  },
  alimentacao: {
    intro: "Boa comida faz toda a diferença. Experimente e comprove a qualidade.",
    action: "pedido"
  },
  beleza: {
    intro: "Você merece se sentir bem consigo mesmo. Agende um horário e transforme seu visual.",
    action: "horário"
  },
  construcao: {
    intro: "Seu projeto merece profissionais qualificados. Transforme sua ideia em realidade.",
    action: "orçamento gratuito"
  },
  tecnologia: {
    intro: "A tecnologia certa pode transformar seu negócio. Descubra como podemos ajudar.",
    action: "diagnóstico"
  },
  financeiro: {
    intro: "Suas finanças merecem atenção profissional. Comece a planejar seu futuro hoje.",
    action: "análise gratuita"
  },
  default: {
    intro: "Se você quer resolver esse desafio de forma profissional, o próximo passo é simples.",
    action: "conversa"
  }
};

/**
 * Detecta o tipo de conclusão baseado no nicho e serviços da empresa
 */
function detectConclusionType(niche?: string, services?: string): ConclusionType {
  const text = `${niche || ''} ${services || ''}`.toLowerCase();
  
  // Ordem importa: mais específicos primeiro
  if (/praga|dedetiza|desinfec|cupim|rato|barata|mosquito|controle.*pragas|truly.*nolen|pest/i.test(text)) {
    return 'pragas';
  }
  if (/advoca|juridic|direito|lei|legal|processo|tribunal/i.test(text)) {
    return 'advocacia';
  }
  if (/clinica|medic|odonto|dentist|saude|hospital|fisio|psico|nutri|derma/i.test(text)) {
    return 'clinica';
  }
  if (/imobi|corretor|aluguel|venda.*imovel|apartamento|casa.*venda|construt/i.test(text)) {
    return 'imobiliaria';
  }
  if (/constru|reforma|arquitet|engenharia|obra|pedreiro|eletric|hidraul/i.test(text)) {
    return 'construcao';
  }
  if (/beleza|salao|cabeleir|estetica|manicure|barbear|maquiagem|spa/i.test(text)) {
    return 'beleza';
  }
  if (/restaurante|lanchonete|pizzaria|comida|gastronomia|chef|culinaria|delivery|alimenta/i.test(text)) {
    return 'alimentacao';
  }
  if (/escola|curso|faculdade|educacao|ensino|professor|treinamento|capacita/i.test(text)) {
    return 'educacao';
  }
  if (/tecnologia|software|app|sistema|programacao|ti|desenvolvimento|digital/i.test(text)) {
    return 'tecnologia';
  }
  if (/contab|financ|invest|banco|credito|emprestimo|seguros|planejamento.*financeiro/i.test(text)) {
    return 'financeiro';
  }
  if (/consult|coaching|mentoria|assessoria|estrategia/i.test(text)) {
    return 'consultoria';
  }
  
  return 'default';
}

export const MANDATORY_FINAL_TITLE = '## Próximo passo';

// Padrões de seções finais genéricas que devem ser removidas
const GENERIC_END_PATTERNS = [
  /##\s*(conclusão|considerações finais|para finalizar|concluindo)[\s\S]*$/i,
  /##\s*(saiba mais|entre em contato|fale conosco|contato)[\s\S]*$/i,
  /##\s*(o que fazer agora|tome uma atitude|aja agora)[\s\S]*$/i,
  /##\s*(resumo|resumindo|em resumo)[\s\S]*$/i
];

/**
 * Gera CTA obrigatório personalizado com dados da empresa E nicho
 */
export function generateCompanyCTA(company: CompanyInfo): string {
  const conclusionType = detectConclusionType(company.niche, company.services);
  const template = CONCLUSION_TEMPLATES[conclusionType];
  
  console.log(`[EDITORIAL CTA] Detected niche type: ${conclusionType} for "${company.name}"`);
  
  const locationText = company.city ? ` em ${company.city}` : '';
  const ctaButtonText = `Fale com a ${company.name} agora`;
  
  // Link clicável se tiver WhatsApp
  const ctaLink = company.whatsapp 
    ? `[${ctaButtonText}](https://wa.me/${company.whatsapp.replace(/\D/g, '')})`
    : `[${ctaButtonText}]`;

  return `## Próximo passo

${template.intro}

A ${company.name}${locationText} está pronta para ajudar. Agende sua ${template.action} e dê o primeiro passo.

**👉 ${ctaLink}**`;
}

// CTA genérico de fallback (quando não há dados da empresa)
export const MANDATORY_CTA_SECTION = `## Próximo passo

Se você precisa de ajuda profissional com esse assunto, não deixe para depois.

Fale com um especialista e resolva isso de uma vez.

**👉 [Fale com um especialista agora]**`;

/**
 * Verifica se o artigo possui CTA válido no formato correto
 */
export function hasValidCTA(content: string): boolean {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length === 0) return false;
  
  const lastH2 = h2Matches[h2Matches.length - 1].trim().toLowerCase();
  return lastH2 === MANDATORY_FINAL_TITLE.toLowerCase();
}

/**
 * Remove seções finais genéricas e "## Próximo passo" existente
 */
function cleanGenericEndings(content: string): string {
  let cleanContent = content;
  
  // Remover seções finais genéricas
  for (const pattern of GENERIC_END_PATTERNS) {
    cleanContent = cleanContent.replace(pattern, '');
  }
  
  // Também remover qualquer "## Próximo passo" existente com conteúdo incorreto
  cleanContent = cleanContent.replace(/##\s*Próximo\s*passo[\s\S]*$/i, '');
  
  // Limpar espaços extras no final
  return cleanContent.trim();
}

/**
 * Garante que o artigo termine com o CTA obrigatório do contrato editorial.
 * Versão genérica (sem dados da empresa) - mantida para compatibilidade.
 */
export function ensureCTA(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // Verificar se já tem o CTA correto com conteúdo adequado
  if (hasValidCTA(content)) {
    // Verificar se o conteúdo após o H2 contém os elementos chave
    const parts = content.split(/##\s*Próximo\s*passo/i);
    if (parts.length > 1) {
      const ctaContent = parts[parts.length - 1].toLowerCase();
      if (ctaContent.includes('especialista') || ctaContent.includes('fale')) {
        console.log('[EDITORIAL CONTRACT] CTA já está válido');
        return content;
      }
    }
  }
  
  console.log('[EDITORIAL CONTRACT] CTA ausente ou inválido - aplicando auto-correção genérica');
  
  const cleanContent = cleanGenericEndings(content);
  const result = cleanContent + '\n\n' + MANDATORY_CTA_SECTION;
  
  console.log('[EDITORIAL CONTRACT] CTA obrigatório genérico anexado');
  
  return result;
}

/**
 * Garante CTA com dados personalizados da empresa E nicho.
 * Esta é a versão preferida quando temos informações do negócio.
 */
export function ensureCompanyCTA(content: string, company: CompanyInfo): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // Se não tiver nome da empresa, usar versão genérica
  if (!company.name || company.name.trim() === '') {
    return ensureCTA(content);
  }

  console.log(`[EDITORIAL CONTRACT] Aplicando CTA personalizado para: ${company.name} (nicho: ${company.niche || 'não especificado'})`);
  
  const cleanContent = cleanGenericEndings(content);
  const companyCTA = generateCompanyCTA(company);
  const result = cleanContent + '\n\n' + companyCTA;
  
  console.log('[EDITORIAL CONTRACT] CTA personalizado com empresa e nicho anexado');
  
  return result;
}

/**
 * Valida se o conteúdo atende ao contrato editorial mínimo
 */
export function validateEditorialContract(content: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // 1. Verificar se tem H1
  if (!content.match(/^# .+$/m)) {
    issues.push('Artigo não possui título H1');
  }
  
  // 2. Verificar se tem H2s
  const h2Count = (content.match(/^## .+$/gm) || []).length;
  if (h2Count < 2) {
    issues.push('Artigo precisa de pelo menos 2 seções H2');
  }
  
  // 3. Verificar CTA obrigatório
  if (!hasValidCTA(content)) {
    issues.push('Artigo não possui seção "## Próximo passo" válida');
  }
  
  // 4. Verificar se CTA tem o conteúdo correto (não menciona automação/tecnologia genérica)
  if (hasValidCTA(content)) {
    const parts = content.split(/##\s*Próximo\s*passo/i);
    if (parts.length > 1) {
      const ctaContent = parts[parts.length - 1].toLowerCase();
      // Verificar por termos proibidos em CTAs de nichos não-tecnológicos
      if (ctaContent.includes('máquina de vendas') || ctaContent.includes('ferramentas automáticas')) {
        issues.push('CTA contém linguagem genérica de automação - deve ser específico ao nicho');
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
