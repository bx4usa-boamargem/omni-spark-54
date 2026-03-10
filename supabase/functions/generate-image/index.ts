import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWriter } from "../_shared/aiProviders.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ANTI_FUTURISTIC_IMAGE_RULES,
  getNicheImageInstructions,
  logBlockedAttempt,
  isMarketingNiche
} from "../_shared/nicheGuard.ts";
import { getNicheProfile } from "../_shared/nicheProfile.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageRequest {
  prompt?: string;  // Agora opcional - será auto-gerado se ausente
  context?: 'hero' | 'cover' | 'problem' | 'pain' | 'solution' | 'result';
  articleTitle?: string;  // Principal - nome preferido
  articleTheme?: string;  // Fallback para compatibilidade
  targetAudience?: string;
  user_id?: string;
  blog_id?: string;
  article_id?: string;  // Se fornecido, faz upload e persiste no DB
  forceRegenerate?: boolean; // Bypass cache for regeneration
}

// ============================================================================
// NICHE_VISUAL_PROFILES - Perfis visuais por NICHO do negócio
// Prioridade: nicho/serviços > título do artigo > fallback genérico
// ============================================================================
const NICHE_VISUAL_PROFILES: Record<string, string> = {
  // SERVIÇOS DE CONTROLE DE PRAGAS
  'pragas|dedetização|desinsetização|cupins|desratização|descupinização|baratas|formigas|mosquitos|extermínio|pest control|truly nolen': `
    Cores: verde natural, marrom terra, branco clean.
    Foco: casas residenciais, jardins, famílias protegidas, lares seguros.
    Mostrar: ambientes domésticos, quintais, proteção do lar, inspeção técnica, casas antigas.
    Evitar: tecnologia, circuitos, escritórios, dashboards, rostos em close.
  `,

  // SALÕES DE BELEZA E ESTÉTICA
  'salão|beleza|cabelo|cabeleireiro|manicure|pedicure|estética|spa|massagem|depilação|sobrancelha': `
    Cores: rosa, dourado, branco, tons pastel, nude.
    Foco: ambientes elegantes de salão, mãos cuidadas, cabelos bonitos.
    Mostrar: espelhos, escovas, produtos de beleza, ambiente aconchegante e sofisticado.
    Evitar: close de rostos, tecnologia, escritórios.
  `,

  // PET SHOPS E VETERINÁRIAS
  'pet|veterinár|animal|cachorro|gato|banho|tosa|ração|clínica veterinária': `
    Cores: azul claro, verde, laranja alegre, branco.
    Foco: animais fofos, ambiente de pet shop, cuidado animal.
    Mostrar: patinhas, produtos pet, ambiente limpo e colorido, consultório veterinário.
    Evitar: rostos humanos, tecnologia, escritórios.
  `,

  // ACADEMIAS E FITNESS
  'academia|fitness|musculação|treino|personal|crossfit|pilates|yoga|funcional': `
    Cores: preto, laranja, vermelho energético, cinza.
    Foco: equipamentos de academia, movimento, energia, saúde.
    Mostrar: halteres, esteiras, ambiente de treino, motivação, superação.
    Evitar: rostos em close, poses de stock photo.
  `,

  // IMOBILIÁRIAS
  'imobiliár|imóv|casa|apartamento|aluguel|venda|corretor|loteamento|condomínio': `
    Cores: azul confiança, branco, dourado, verde.
    Foco: fachadas de imóveis, interiores bonitos, chaves, contratos.
    Mostrar: casas, apartamentos, salas de estar, jardins, varandas.
    Evitar: rostos, tecnologia excessiva.
  `,

  // CONTABILIDADE E FINANCEIRO
  'contabil|contador|fiscal|tributár|financeiro|imposto|assessoria contábil': `
    Cores: azul escuro, cinza, verde (dinheiro), branco.
    Foco: documentos, calculadoras, planilhas, organização.
    Mostrar: mesas organizadas, papéis, gráficos, profissionalismo, escritório.
    Evitar: rostos em close, tecnologia futurista.
  `,

  // ADVOCACIA E JURÍDICO — legal_authority profile v2 (IMAGE_CALIBRATION_PATCH)
  'advogad|advocacia|jurídico|direito|tribunal|lei|escritório de advocacia|previdenciár': `
    Cores: azul escuro (#1e3a5f), dourado (#b8922a), cinza elegante, bordô.
    Foco: livros jurídicos, martelo de juiz dourado, documentos oficiais, biblioteca jurídica.
    Mostrar: ambiente de escritório colonial/histórico, confiança, autoridade institucional.

    ## IDENTITY_CALIBRATION_RULES — legal_authority (OBRIGATÓRIO):

    ROLE_CONTRAST — quando a cena tiver duas pessoas:
    ✅ Advogado: postura controlada, roupa profissional (terno/paletó escuro), mãos firmes
    ✅ Cliente: postura receptiva, roupa civil, mãos em posição de escuta ou preocupação
    ❌ PROIBIDO: duas pessoas com mesma estrutura corporal, mesma postura ou mesmo vestuário

    ANATOMICAL_DISTINCTNESS — quando mãos aparecerem:
    ✅ OBRIGATÓRIO: diferença visível na idade das mãos (uma jovem, uma mais envelhecida)
    ✅ OBRIGATÓRIO: variação de tom de pele entre os indivíduos (um mais claro, um mais escuro)
    ✅ OBRIGATÓRIO: estrutura de pulso diferente (um mais fino, um mais largo)
    ❌ PROIBIDO: mãos anatomicamente idênticas ou simétricas em uma mesma cena
    ❌ PROIBIDO: clonagem de textura de pele, veias ou articulações entre indivíduos

    IDENTITY_SIMILARITY_THRESHOLD:
    ✅ Similaridade visual entre pessoas na mesma imagem: máximo 30%
    ❌ REJEITAR render se similaridade > 70% entre qualquer par de indivíduos

    PREFERÊNCIA MÁXIMA: cenas sem pessoas — foco em objetos, ambiente, documentos.
    Evitar: tecnologia excessiva, rostos em close, poses genéricas de stock photo.
  `,

  // SAÚDE E CLÍNICAS
  'saúde|clínica|médico|odonto|dentista|fisioterapeuta|nutri|hospital|consultório': `
    Cores: branco, azul claro, verde suave, menta.
    Foco: ambiente clínico limpo, equipamentos médicos, cuidado.
    Mostrar: consultórios, profissionais de jaleco (de costas), bem-estar.
    Evitar: close de rostos, imagens perturbadoras.
  `,

  // RESTAURANTES E GASTRONOMIA
  'restaurante|culinária|gastronomia|buffet|chef|comida|pizzaria|lanchonete|cafeteria|padaria': `
    Cores: vermelho, laranja, dourado, marrom.
    Foco: pratos apetitosos, ingredientes frescos, ambiente aconchegante.
    Mostrar: mesas postas, cozinha, ingredientes, ambiente de restaurante.
    Evitar: rostos, tecnologia.
  `,

  // CONSTRUÇÃO E REFORMAS
  'construção|reforma|arquitetura|engenharia|pedreiro|obra|empreiteira|projeto': `
    Cores: laranja, amarelo, cinza, azul.
    Foco: canteiros de obra, plantas, ferramentas, imóveis.
    Mostrar: projetos, edificações, transformação, trabalho manual, capacetes.
    Evitar: rostos em close.
  `,

  // EDUCAÇÃO E CURSOS
  'educação|curso|escola|professor|ensino|aula|treinamento|coaching|mentoria': `
    Cores: azul, verde, laranja alegre, amarelo.
    Foco: salas de aula, livros, quadros, aprendizado.
    Mostrar: ambiente educacional, materiais didáticos, progresso, conhecimento.
    Evitar: rostos em close de alunos.
  `,

  // LIMPEZA E CONSERVAÇÃO
  'limpeza|faxina|conservação|higienização|lavanderia|passadoria': `
    Cores: azul claro, branco, verde água.
    Foco: ambientes limpos, produtos de limpeza, organização.
    Mostrar: casas limpas, produtos, equipamentos, resultado do trabalho.
    Evitar: rostos, tecnologia.
  `,

  // JARDINAGEM E PAISAGISMO
  'jardim|jardinagem|paisagismo|poda|grama|plantas|floricul': `
    Cores: verde, marrom terra, amarelo, flores coloridas.
    Foco: jardins bonitos, plantas, flores, natureza.
    Mostrar: jardins, vasos, ferramentas de jardinagem, paisagens verdes.
    Evitar: rostos, tecnologia.
  `,

  // OFICINAS E MECÂNICAS
  'oficina|mecânica|carro|moto|veículo|funilaria|auto center': `
    Cores: vermelho, preto, cinza, laranja.
    Foco: veículos, ferramentas, garagem, manutenção.
    Mostrar: carros, peças, chaves, ambiente de oficina.
    Evitar: rostos em close.
  `,

  // FOTOGRAFIA E VÍDEO
  'fotograf|vídeo|filmagem|ensaio|casamento|eventos': `
    Cores: preto, branco, dourado, cores vibrantes.
    Foco: câmeras, equipamentos, momentos capturados.
    Mostrar: equipamentos fotográficos, cenários, luz, criatividade.
    Evitar: rostos em close.
  `,

  // SEGURANÇA E VIGILÂNCIA
  'segurança|vigilância|alarme|câmera|monitoramento|portaria': `
    Cores: azul escuro, preto, cinza, verde.
    Foco: equipamentos de segurança, proteção, monitoramento.
    Mostrar: câmeras, cercas, proteção residencial, tranquilidade.
    Evitar: rostos.
  `,

  // TECNOLOGIA (para empresas realmente tech)
  'tecnologia|software|app|sistema|ti|desenvolvimento|programação|startup|saas': `
    Cores: azul, roxo, ciano, neon.
    Foco: telas, código, dashboards, interfaces.
    Mostrar: computadores, workspaces tech, inovação, reuniões virtuais.
    Evitar: rostos repetidos, stock photo genérico.
  `,

  // MARKETING E PUBLICIDADE
  'marketing|publicidade|agência|redes sociais|social media|branding': `
    Cores: laranja, coral, roxo, azul vibrante.
    Foco: campanhas, métricas sociais, criatividade.
    Mostrar: telas com analytics, brainstorming, post-its, ideias.
    Evitar: rostos em close.
  `,
};

// Função para obter perfil visual baseado no NICHO do negócio
function getVisualProfileFromNiche(niche: string, services: string, title: string): string {
  // Combinar contexto do negócio para análise
  const businessContext = `${niche} ${services}`.toLowerCase();

  // Primeiro: tentar match pelo nicho/serviços da empresa
  for (const [pattern, profile] of Object.entries(NICHE_VISUAL_PROFILES)) {
    if (new RegExp(pattern, 'i').test(businessContext)) {
      console.log(`Visual profile matched by BUSINESS: ${pattern.substring(0, 40)}...`);
      return profile;
    }
  }

  // Segundo: tentar match pelo título do artigo (fallback)
  const titleLower = title.toLowerCase();
  for (const [pattern, profile] of Object.entries(NICHE_VISUAL_PROFILES)) {
    if (new RegExp(pattern, 'i').test(titleLower)) {
      console.log(`Visual profile matched by TITLE: ${pattern.substring(0, 40)}...`);
      return profile;
    }
  }

  // Fallback genérico (NÃO tecnológico)
  console.log('Visual profile: using GENERIC fallback (non-tech)');
  return `
    Cores: neutras e profissionais (azul, branco, cinza, bege).
    Foco: ambiente de trabalho real relacionado ao tema do artigo.
    Mostrar: contexto profissional, organização, qualidade, resultados.
    Evitar: tecnologia excessiva, circuitos, dashboards futuristas, rostos em close.
    Preferir: ambientes reais, objetos do cotidiano, conceitos visuais claros.
  `;
}

// Generate a normalized hash for cache lookup
function generateHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate fallback prompt when none is provided - RESILIENTE
function buildFallbackPrompt(title: string, context: string): string {
  const contextDescriptions: Record<string, string> = {
    hero: 'imagem principal de capa profissional e impactante',
    cover: 'imagem de capa profissional e atraente',
    problem: 'ilustração visual do problema enfrentado pelo público',
    pain: 'representação da dor ou frustração causada pelo problema',
    solution: 'demonstração da solução de forma moderna e profissional',
    result: 'resultado positivo após implementar a solução'
  };

  return `Crie uma imagem fotorrealista para um artigo intitulado "${title}". 
Tipo: ${contextDescriptions[context] || 'imagem ilustrativa'}. 
Estilo: fotografia profissional, moderno, clean, sem texto, cores harmoniosas.
Aspecto: 16:9, alta qualidade, nítida e bem definida.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting image generation request`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prompt, context, articleTitle, articleTheme, targetAudience, user_id, blog_id, article_id, forceRegenerate }: ImageRequest = await req.json();

    // Aceitar articleTitle OU articleTheme para máxima compatibilidade
    const effectiveTitle = articleTitle || articleTheme || '';
    const effectiveContext = context || 'cover';

    console.log(`[${requestId}] Request params:`, {
      hasPrompt: !!prompt,
      hasTitle: !!articleTitle,
      hasTheme: !!articleTheme,
      effectiveTitle: effectiveTitle.substring(0, 50),
      context: effectiveContext,
      blog_id,
      forceRegenerate: !!forceRegenerate
    });

    // Auto-generate prompt if missing - LÓGICA RESILIENTE
    let finalPrompt = prompt;

    if (!prompt || prompt.trim().length === 0) {
      if (!effectiveTitle || effectiveTitle.trim().length === 0) {
        console.error(`[${requestId}] Missing prompt, articleTitle and articleTheme`);
        return new Response(
          JSON.stringify({
            error: 'Não foi possível gerar a imagem',
            details: 'O artigo precisa ter um título antes de gerar imagem.',
            action: 'Adicione um título ao artigo e tente novamente.',
            code: 'MISSING_TITLE',
            requestId
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Gerar prompt automaticamente a partir do título
      finalPrompt = buildFallbackPrompt(effectiveTitle, effectiveContext);
      console.log(`[${requestId}] Auto-generated prompt from title "${effectiveTitle}": ${finalPrompt.substring(0, 100)}...`);
    }

    // Fetch AI model preference from content_preferences
    let imageModel = 'google/gemini-2.5-flash-image-preview';
    if (blog_id) {
      const { data: prefs } = await supabase
        .from('content_preferences')
        .select('ai_model_image')
        .eq('blog_id', blog_id)
        .maybeSingle();

      if (prefs?.ai_model_image) {
        imageModel = prefs.ai_model_image;
        console.log(`Using configured image model: ${imageModel}`);
      }
    }

    // ============================================================================
    // BUSCAR BUSINESS PROFILE - Para perfil visual baseado no nicho
    // ============================================================================
    let businessNiche = '';
    let businessServices = '';
    let businessCity = '';
    let businessCompanyName = '';

    if (blog_id) {
      const { data: profile } = await supabase
        .from('business_profile')
        .select('niche, services, city, company_name')
        .eq('blog_id', blog_id)
        .maybeSingle();

      if (profile) {
        businessNiche = profile.niche || '';
        businessServices = profile.services || '';
        businessCity = profile.city || '';
        businessCompanyName = profile.company_name || '';
        console.log(`[${requestId}] Business profile: niche="${businessNiche}", services="${businessServices?.substring(0, 50)}..."`);
      }
    }

    // ============================================================================
    // PROMPT EDITORIAL PROFISSIONAL - DIRETOR DE FOTOGRAFIA
    // Padrão: Estilo Forbes / Harvard Business Review
    // SISTEMA ANTI-CLONE V2.0 - Cada imagem é única
    // ============================================================================

    // Generate unique visual seed for this request
    const visualSeed = crypto.randomUUID().substring(0, 8);

    const contextInstructions: Record<string, string> = {
      hero: 'Representar o tema principal do artigo de forma impactante e memorável.',
      cover: 'Representar o tema principal do artigo como uma capa editorial premium.',
      problem: 'Mostrar a dor, frustração ou dificuldade real enfrentada pelo público-alvo.',
      pain: 'Representar visualmente a frustração, o obstáculo ou o desconforto real.',
      solution: 'Mostrar ação, organização, tecnologia ou melhoria sendo implementada.',
      result: 'Mostrar progresso, alívio, crescimento ou sucesso real e tangível.'
    };

    // ============================================================================
    // USAR PERFIL VISUAL BASEADO NO NICHO DO NEGÓCIO (não apenas título)
    // ============================================================================
    const visualProfile = getVisualProfileFromNiche(businessNiche, businessServices, effectiveTitle);

    // ============================================================================
    // NICHE LOCK SYSTEM - Carregar perfil de nicho para regras de imagem
    // ============================================================================
    let nicheProfile = null;
    if (blog_id) {
      nicheProfile = await getNicheProfile(supabase, blog_id);
      console.log(`[${requestId}] Niche profile loaded: ${nicheProfile?.name || 'default'}`);
    }

    // Obter instruções visuais específicas do nicho
    const nicheImageInstructions = getNicheImageInstructions(nicheProfile?.name || 'default');

    // Determinar se é nicho de marketing (pode ter elementos tech)
    const allowTechElements = isMarketingNiche(nicheProfile?.name);

    // SISTEMA ANTI-CLONE V2.0 + ANTI-FUTURISTA (do nicheGuard)
    const ANTI_CLONE_RULES = `
## ⛔ REGRAS ABSOLUTAS ANTI-CLONE (INVIOLÁVEIS):

❌ PROIBIDO:
- Repetir a MESMA pessoa em imagens diferentes do mesmo artigo
- Gerar rostos DUPLICADOS ou "clonados" (trigêmeos, gêmeos)
- Close-up de rostos humanos (preferir ambientes)
- Poses genéricas de "stock photo" (braços cruzados sorrindo)
- Simetria artificial entre pessoas
- Grupos de pessoas iguais ou muito similares

✅ OBRIGATÓRIO:
- Focar em AMBIENTES: escritórios, telas, dashboards, mesas de trabalho
- Mostrar MÃOS interagindo com tecnologia (teclados, mouses, tablets)
- Priorizar OBJETOS: computadores, documentos, gráficos, post-its
- Usar conceitos ABSTRATOS quando possível (diagramas, ilustrações conceituais)
- Se houver pessoas, mostrar de COSTAS ou PARCIALMENTE
- Diversidade de idades, etnias e estilos quando pessoas aparecem
- Cada imagem deve ter composição ÚNICA

🎲 SEED VISUAL ÚNICO: ${visualSeed}
Este seed garante identidade visual única para esta geração.
`.trim();

    // Combinar regras anti-futurista (obrigatório para nichos não-marketing)
    const antiFuturisticSection = allowTechElements ? '' : `
${ANTI_FUTURISTIC_IMAGE_RULES}
`;

    const enhancedPrompt = `
Você é um diretor de fotografia editorial para blogs profissionais.
Crie uma imagem fotográfica realista que represente VISUALMENTE o conteúdo descrito.

${ANTI_CLONE_RULES}
${antiFuturisticSection}

## PERFIL VISUAL DO NICHO: ${nicheProfile?.displayName || 'Geral'}
${nicheImageInstructions}

## PERFIL VISUAL BASEADO NO NEGÓCIO:
${visualProfile}

CONTEXTO DO NEGÓCIO:
${businessCompanyName ? `Empresa: ${businessCompanyName}` : ''}
${businessNiche ? `Nicho: ${businessNiche}` : ''}
${businessServices ? `Serviços: ${businessServices.substring(0, 150)}` : ''}
${businessCity ? `Localização: ${businessCity}` : ''}

CONTEXTO DO ARTIGO:
Tema: ${effectiveTitle}
${targetAudience ? `Público-alvo: ${targetAudience}` : ''}

TIPO DE IMAGEM (${effectiveContext.toUpperCase()}):
${contextInstructions[effectiveContext] || 'Ilustrar o conceito de forma profissional e realista.'}

DESCRIÇÃO ESPECÍFICA:
${finalPrompt}

REQUISITOS TÉCNICOS ABSOLUTOS:
- Aspecto 16:9 para web
- Alta resolução, nítida e bem definida
- Iluminação NATURAL e profissional
- Composição equilibrada
- EVITAR: close-up de rostos, pessoas similares, stock photo genérico
${allowTechElements ? '' : '- PROIBIDO: hologramas, telas flutuantes, HUD futurista, sci-fi, neon irreal'}
- PREFERIR: ambientes REAIS do nicho, objetos do COTIDIANO do serviço, conceitos visuais

A imagem DEVE parecer uma fotografia REAL capturada no mundo real, relacionada ao nicho do negócio.
NÃO inclua: texto, logotipos, marcas d'água, elementos caricatos, ilustrações genéricas, rostos repetidos.
${allowTechElements ? '' : 'NÃO inclua: hologramas, interfaces futuristas, elementos de ficção científica.'}
`.trim();

    // Generate cache key and check cache
    const cacheKey = `${finalPrompt}|${effectiveContext}|${effectiveTitle}`;
    const contentHash = generateHash(cacheKey);

    // ============================================================================
    // CACHE LOGIC - Bypass if forceRegenerate is true
    // ============================================================================
    if (!forceRegenerate) {
      console.log(`[${requestId}] Checking cache for image: ${effectiveContext}, hash: ${contentHash}`);
      const { data: cacheHit } = await supabase
        .from("ai_content_cache")
        .select("*")
        .eq("cache_type", "image")
        .eq("content_hash", contentHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cacheHit) {
        console.log(`CACHE HIT for image: ${context}`);

        // Increment hit counter
        await supabase
          .from("ai_content_cache")
          .update({ hits: (cacheHit.hits || 0) + 1 })
          .eq("id", cacheHit.id);

        // Log cache hit
        if (user_id) {
          await supabase.from("consumption_logs").insert({
            user_id,
            blog_id: blog_id || null,
            action_type: "image_generation_cached",
            action_description: `Cached Image: ${effectiveContext}`,
            model_used: "cache",
            input_tokens: 0,
            output_tokens: 0,
            images_generated: 0,
            estimated_cost_usd: 0,
            metadata: { context: effectiveContext, articleTitle: effectiveTitle, cache_hit: true },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            imageBase64: (cacheHit.response_data as { imageBase64?: string })?.imageBase64,
            context: effectiveContext,
            from_cache: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log(`[${requestId}] FORCE REGENERATE - Skipping cache for ${effectiveContext}`);
    }

    // Ensure we use the correct model with -preview suffix for image generation
    const actualModel = 'google/gemini-2.5-flash-image-preview';
    console.log(`[${requestId}] Generating image for context: ${effectiveContext}, model: ${actualModel}`);
    console.log(`Enhanced prompt: ${enhancedPrompt.substring(0, 200)}...`);

    // Retry logic for image generation (sometimes model returns text without image)
    let imageData: string | null = null;
    let lastError: string | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const responseResult = await callWriter({
          messages: [
              {
                role: 'user',
                content: attempt === 1
                  ? enhancedPrompt
                  : `IMPORTANTE: Você DEVE gerar uma imagem. Não responda com texto, apenas gere a imagem.\n\n${enhancedPrompt}`
              }
            ],
          temperature: 0.7,
          maxTokens: 4096,
        });

        if (!responseResult.success || !responseResult.data?.content) {
          console.error("[AI] Writer failed:", responseResult.fallbackReason);
          lastError = responseResult.fallbackReason || 'AI failed';
          continue; // Try next attempt
        }

        // Extract imageData from response
        const content = responseResult.data.content;
        if (typeof content === 'string' && content.startsWith('data:image')) {
          imageData = content;
        } else if (Array.isArray(content)) {
          for (const part of content) {
            if (part?.type === 'image' && part?.source?.data) {
              imageData = `data:${part.source.media_type || 'image/png'};base64,${part.source.data}`;
              break;
            } else if (part?.inline_data?.data) {
              imageData = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
              break;
            }
          }
        }

        if (imageData) {
          console.log(`[${requestId}] Image data extracted on attempt ${attempt}`);
          break; // Success
        } else {
          console.warn(`[${requestId}] Attempt ${attempt}: no image data in response, retrying...`);
          lastError = 'No image data in response';
        }
      } catch (retryError) {
        lastError = retryError instanceof Error ? retryError.message : 'Unknown error';
        console.error(`[${requestId}] Attempt ${attempt} error:`, retryError);
        if (attempt === maxRetries) throw retryError;
      }
    } // end retry loop

    if (!imageData) {
      throw new Error(`Failed to generate image after ${maxRetries} attempts: ${lastError}`);
    }

    const estimatedCost = 0.02;

    // === UPLOAD TO STORAGE AND PERSIST ===
    let publicUrl: string | null = null;
    let storagePath: string | null = null;

    // Upload to storage if we have an article_id or just generate a unique filename
    try {
      const timestamp = Date.now();
      const fileName = article_id
        ? `${effectiveContext}-${article_id}-${timestamp}.png`
        : `${effectiveContext}-${blog_id || 'standalone'}-${timestamp}.png`;

      // Decode base64 and upload - extract pure base64 from Data URI if needed
      let base64Pure = imageData;
      if (imageData.startsWith('data:')) {
        const commaIndex = imageData.indexOf(',');
        if (commaIndex > -1) {
          base64Pure = imageData.substring(commaIndex + 1);
        }
      }
      const imageBytes = Uint8Array.from(atob(base64Pure), c => c.charCodeAt(0));

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(fileName, imageBytes, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error(`[${requestId}] Storage upload failed:`, uploadError);
      } else {
        storagePath = uploadData.path;
        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(uploadData.path);
        publicUrl = urlData.publicUrl;
        console.log(`[${requestId}] Image uploaded to storage: ${publicUrl}`);
      }
    } catch (uploadError) {
      console.error(`[${requestId}] Upload error:`, uploadError);
    }

    // Persist to article if article_id provided
    if (article_id && publicUrl) {
      try {
        if (effectiveContext === 'cover' || effectiveContext === 'hero') {
          // Persist cover image
          const { error: updateError } = await supabase
            .from('articles')
            .update({
              featured_image_url: publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', article_id);

          if (updateError) {
            console.error(`[${requestId}] Article update failed:`, updateError);
          } else {
            console.log(`[${requestId}] Article ${article_id} updated with featured_image_url`);
          }
        } else {
          // Persist content images (problem, solution, result, etc.)
          const { data: article } = await supabase
            .from('articles')
            .select('content_images')
            .eq('id', article_id)
            .single();

          const currentImages = (article?.content_images as any[]) || [];

          // Determine after_section based on context
          const sectionMap: Record<string, number> = {
            'problem': 1,
            'pain': 1,
            'solution': 2,
            'result': 3
          };

          const newImage = {
            context: effectiveContext,
            url: publicUrl,
            after_section: sectionMap[effectiveContext] || currentImages.length + 1
          };

          // Avoid duplicates by context
          const filteredImages = currentImages.filter(img => img.context !== effectiveContext);
          const updatedImages = [...filteredImages, newImage];

          const { error: updateError } = await supabase
            .from('articles')
            .update({
              content_images: updatedImages,
              updated_at: new Date().toISOString()
            })
            .eq('id', article_id);

          if (updateError) {
            console.error(`[${requestId}] Content images update failed:`, updateError);
          } else {
            console.log(`[${requestId}] Article ${article_id} content_images updated with ${effectiveContext}`);
          }
        }
      } catch (dbError) {
        console.error(`[${requestId}] DB error:`, dbError);
      }
    }

    // Log consumption if user_id provided
    if (user_id) {
      try {
        await supabase.from("consumption_logs").insert({
          user_id,
          blog_id: blog_id || null,
          action_type: "image_generation",
          action_description: `Image: ${effectiveContext} for ${effectiveTitle.substring(0, 50)}`,
          model_used: imageModel,
          input_tokens: 0,
          output_tokens: 0,
          images_generated: 1,
          estimated_cost_usd: estimatedCost,
          metadata: { context: effectiveContext, articleTitle: effectiveTitle, publicUrl },
        });
        console.log("Consumption logged for image generation");
      } catch (logError) {
        console.warn("Failed to log consumption:", logError);
      }
    }

    // Save to cache for future use
    try {
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      await supabase.from("ai_content_cache").upsert({
        cache_type: "image",
        content_hash: contentHash,
        prompt_text: cacheKey,
        response_data: { imageBase64: imageData, publicUrl },
        model_used: imageModel,
        tokens_saved: 0,
        cost_saved_usd: estimatedCost,
        blog_id: blog_id || null,
        user_id: user_id || null,
        expires_at: expiresAt.toISOString(),
        hits: 0,
      }, { onConflict: 'cache_type,content_hash' });
      console.log("Image saved to cache");
    } catch (cacheError) {
      console.warn("Failed to save to cache:", cacheError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageBase64: imageData,
        publicUrl,        // NEW: Direct storage URL
        storagePath,      // NEW: Storage path
        context: effectiveContext,
        requestId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-image:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
