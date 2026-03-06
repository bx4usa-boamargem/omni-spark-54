# ARTICLE ENGINE MASTER — OmniSeen
**Versão:** 2.0.0
**Alinhamento arquitetural:** ARCHITECTURE_FULL_INTELLIGENCE_MAP v2.0
**Data:** 2026-02-28
**Localização:** `docs/ARTICLE_ENGINE_MASTER.md`
**Status:** Produção — Documento Canônico

> **Nota de migração v1.0 → v2.0**
> O Article Engine foi promovido de pipeline isolado para **subsystem de produção supervisionado pela Intelligence Layer**, controlado pelo MED e governado pelo system-state-governor. Todos os componentes existentes (`generate-article-structured/`, `geoWriterCore.ts`, `structureRotation.ts`) são reclassificados como **skills e operadores internos** do subsystem. Nenhum componente é removido — todos são integrados ao contrato arquitetural OmniSeen.

---

## ÍNDICE

1. [Identidade do Subsystem](#1-identidade-do-subsystem)
2. [Posicionamento Arquitetural](#2-posicionamento-arquitetural)
3. [Integração com MED e Governor](#3-integração-com-med-e-governor)
4. [Arquitetura Multi-Dimensional](#4-arquitetura-multi-dimensional)
5. [Pipeline de Execução — 12 Etapas](#5-pipeline-de-execução--12-etapas)
6. [Templates Estruturais](#6-templates-estruturais)
7. [Configuração de Nichos](#7-configuração-de-nichos)
8. [Validação — Checklist de 25 Pontos](#8-validação--checklist-de-25-pontos)
9. [Regras de Ouro](#9-regras-de-ouro)
10. [Mapeamento de Componentes Existentes](#10-mapeamento-de-componentes-existentes)
11. [Contrato de Interfaces](#11-contrato-de-interfaces)
12. [Roadmap de Sprints](#12-roadmap-de-sprints)

---

## 1. IDENTIDADE DO SUBSYSTEM

| Campo | Valor |
|---|---|
| **Nome** | Article Engine |
| **ID** | `article-engine` |
| **Tipo** | Intelligence Subsystem |
| **Camada** | Layer 3 — Production (Intelligence Subsystem) |
| **Autoridade** | Operacional (controlado pelo MED) |
| **Controlador** | MED — Modular Entity Director |
| **Governança** | system-state-governor |
| **Versão** | 2.0.0 |
| **Runtime** | Antigravity |
| **Auto-Heal** | Habilitado |
| **Governor Reporting** | Obrigatório |

### Missão

O Article Engine é o motor de geração de artigos de autoridade local do OmniSeen. Sua responsabilidade é transformar um `job_request` qualificado em um artigo profissional, semanticamente rico, E-E-A-T-compliant e estruturalmente variado — executando sob o controle do `generation-orchestrator` e reportando estado ao `system-state-governor` via MED.

O Article Engine não existe como sistema autônomo. Ele opera **dentro do pipeline de produção OmniSeen** como a implementação concreta da camada de geração de conteúdo.

---

## 2. POSICIONAMENTO ARQUITETURAL

```
╔══════════════════════════════════════════════════════════════════════╗
║          OMNISEEN — ARTICLE ENGINE NO MAPA DE CAMADAS               ║
╚══════════════════════════════════════════════════════════════════════╝

  INTELLIGENCE LAYER
  ─────────────────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────────────────────┐
  │  MED — Modular Entity Director                               │
  │  ● Recebe job_request do Frontend                            │
  │  ● Valida e roteia para generation-orchestrator              │
  │  ● Supervisiona Article Engine como subsystem registrado     │
  └──────────────────────────────┬───────────────────────────────┘
                                 │ autorizado pelo governor
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  generation-orchestrator (Layer 2)                           │
  │  ● Despacha tasks para os agentes do Article Engine          │
  │  ● Sequencia as 12 etapas do pipeline                        │
  │  ● Gerencia retries e falhas                                 │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────┐
  │  ARTICLE ENGINE SUBSYSTEM (Layer 3)                          │
  │                                                              │
  │  ┌─────────────────────┐   ┌──────────────────────────────┐ │
  │  │ research-intel-agent│   │ content-architect            │ │
  │  │ + serp-analyzer     │   │ + article-structure-intel.   │ │
  │  │ + lead-intent-det.  │   │ + super-page-builder         │ │
  │  └─────────────────────┘   │ + content-cluster-orch.      │ │
  │                            │ + internal-link-architect    │ │
  │  ┌─────────────────────┐   └──────────────────────────────┘ │
  │  │ content-writer      │   ┌──────────────────────────────┐ │
  │  │ + authority-writer  │   │ seo-validator                │ │
  │  │ + eeat-enrichment   │   │ + 12 SEO checks              │ │
  │  │ + humanization      │   │ + E-E-A-T gate               │ │
  │  │ + section-expansion │   └──────────────────────────────┘ │
  │  └─────────────────────┘                                     │
  │                                                              │
  │  ┌─────────────────────┐   ┌──────────────────────────────┐ │
  │  │ image-strategy-agent│   │ publisher-agent              │ │
  │  │ + image-variability │   │ + deployment-safety-guardian │ │
  │  └─────────────────────┘   └──────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────┘

  INFRASTRUCTURE LAYER
  ─────────────────────────────────────────────────────────────────
  Supabase (tabela articles, 57 colunas)  │  Vercel (deploy)
```

### Relação com Agentes OmniSeen

| Agente OmniSeen | Papel no Article Engine |
|---|---|
| `research-intelligence-agent` | Etapas 1–2: SERP, intent, research brief |
| `content-architect` | Etapas 3–4: blueprint, estrutura, clusters |
| `content-writer` | Etapas 5–7: prosa, E-E-A-T, humanização |
| `seo-validator` | Etapa 8: gate de qualidade, 12 checks |
| `image-strategy-agent` | Etapa 9: especificação visual |
| `publisher-agent` | Etapas 10–12: montagem, deploy, registro |

---

## 3. INTEGRAÇÃO COM MED E GOVERNOR

### 3.1 Fluxo de Autorização

```
Frontend submete job_request
        │
        ▼
MED recebe e valida:
  ● subsystem_target: "article-engine"
  ● niche, subconta, template, modo declarados
  ● usuário autenticado via Supabase Auth
        │
        ▼
MED consulta system-state-governor:
  ● GET /functions/v1/governor/state
  ● Resposta deve ser: status = HEALTHY
        │
        ▼
Governor autoriza:
  ● Emite lifecycle_event: JOB_AUTHORIZED
  ● Confirma Layer 1 e Layer 2 operacionais
        │
        ▼
MED roteia para generation-orchestrator
  ● job_request enriquecido com subsystem_context
  ● subsystem_context.engine = "article-engine"
  ● subsystem_context.version = "2.0.0"
```

### 3.2 Eventos de Lifecycle Emitidos ao Governor

| Evento | Quando | Payload |
|---|---|---|
| `ARTICLE_JOB_RECEIVED` | MED recebe request | `{job_id, niche, template, modo}` |
| `ARTICLE_PIPELINE_STARTED` | Orchestrator inicia | `{job_id, steps_total: 12}` |
| `ARTICLE_STEP_COMPLETED` | Cada etapa conclui | `{job_id, step, step_name, duration_ms}` |
| `ARTICLE_GATE_PASSED` | SEO validator PASS | `{job_id, eeat_score, warnings}` |
| `ARTICLE_GATE_FAILED` | SEO validator FAIL | `{job_id, blocking_checks}` |
| `ARTICLE_PUBLISHED` | Publisher confirma | `{job_id, url, word_count, cluster_id}` |
| `ARTICLE_FAILED` | Qualquer step falha após retries | `{job_id, step, error_code}` |

### 3.3 Registro do Subsystem no Governor

O Article Engine deve estar registrado no `system-state-governor` como entidade observável:

```json
{
  "agent_id": "article-engine",
  "layer": 3,
  "type": "subsystem",
  "version": "2.0.0",
  "capabilities": [
    "article-generation",
    "superpage-production",
    "local-authority-content",
    "niche-aware-writing",
    "template-rotation"
  ],
  "health_endpoint": "/functions/v1/article-engine/status",
  "critical": false
}
```

---

## 4. ARQUITETURA MULTI-DIMENSIONAL

O Article Engine opera em 5 dimensões configuráveis que determinam como cada artigo é gerado.

```
╔══════════════════════════════════════════════════════════════╗
║          5 DIMENSÕES DO ARTICLE ENGINE                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  DIM 1: NICHO                                                ║
║  Define vocabulário, tom e sinais E-E-A-T específicos        ║
║  13 nichos configurados (ver Seção 7)                        ║
║                                                              ║
║  DIM 2: SUBCONTA                                             ║
║  Persona da empresa: nome, localidade, especialização        ║
║  Determina voz, credenciais e proof points                   ║
║                                                              ║
║  DIM 3: INTENÇÃO                                             ║
║  INFORMATIONAL │ COMMERCIAL │ TRANSACTIONAL │ NAVIGATIONAL   ║
║  Determina estrutura CTA e densidade comercial               ║
║                                                              ║
║  DIM 4: TEMPLATE                                             ║
║  5 templates estruturais com variantes anti-padrão           ║
║  (ver Seção 6)                                               ║
║                                                              ║
║  DIM 5: MODO                                                 ║
║  SUPERPAGE │ SUPPORTING │ CLUSTER │ FAQ │ COMPARISON         ║
║  Determina profundidade, word count e papel no cluster       ║
╚══════════════════════════════════════════════════════════════╝
```

### Matriz de Configuração por Modo

| Modo | Word Count Alvo | E-E-A-T Density | Papel no Cluster |
|---|---|---|---|
| `SUPERPAGE` | 3.500–6.000 | MAXIMUM | PILLAR |
| `SUPPORTING` | 1.200–2.500 | HIGH | SUPPORTING |
| `CLUSTER` | 800–1.500 | STANDARD | SUPPORTING |
| `FAQ` | 600–1.200 | STANDARD | BRIDGE |
| `COMPARISON` | 1.500–3.000 | HIGH | SUPPORTING |

---

## 5. PIPELINE DE EXECUÇÃO — 12 ETAPAS

O pipeline é executado sequencialmente pelo `generation-orchestrator`. Nenhuma etapa inicia sem a anterior ter retornado `task_result` com status `SUCCESS` ou `PARTIAL`.

```
╔══════════════════════════════════════════════════════════════════════╗
║                ARTICLE ENGINE — PIPELINE 12 ETAPAS                 ║
╚══════════════════════════════════════════════════════════════════════╝
```

### FASE 1 — INTELIGÊNCIA (Etapas 1–3)

**Etapa 1 — SERP Intelligence**
```
Agente:   research-intelligence-agent
Skill:    serp-intelligence-analyzer
Input:    topic, primary_keyword, locale, niche
Output:   serp_analysis {top_results, gaps, intent, authority_threshold}
Timeout:  120s  │  Retries: 3
Fallback: cache SERP < 48h se API indisponível
```

**Etapa 2 — Research Brief**
```
Agente:   research-intelligence-agent
Skill:    lead-intent-detector
Input:    serp_analysis + niche_profile
Output:   research_brief {clusters, keywords, eeat_signals, bofu_signals}
Timeout:  60s   │  Retries: 3
Fallback: brief parcial com low_data_confidence: true
```

**Etapa 3 — Cluster & Link Intelligence**
```
Agente:   content-architect
Skill:    content-cluster-orchestrator + internal-link-architect
Input:    research_brief + content_registry + cluster_map
Output:   cluster_assignment {role, inbound_links, outbound_links}
Timeout:  60s   │  Retries: 3
Fallback: homepage como inbound fallback se zero fontes
```

---

### FASE 2 — ARQUITETURA (Etapas 4–5)

**Etapa 4 — Structure Validation**
```
Agente:   content-architect
Skill:    article-structure-intelligence
Input:    research_brief + cluster_assignment + modo
Output:   validated_heading_structure {H1→H4, readability_score, flow_score}
Timeout:  45s   │  Retries: 3
Fallback: auto-correção de hierarquia (promoção H2→H1, inserção H2 faltante)
```

**Etapa 5 — Blueprint Generation**
```
Agente:   content-architect
Skill:    super-page-builder (se SUPERPAGE) │ blueprint padrão (outros modos)
Input:    validated_heading_structure + niche_profile + subconta + intenção
Output:   content_blueprint {sections[], cta_placements, eeat_requirements,
                             word_count_targets, internal_links, faq_targets}
Timeout:  60s   │  Retries: 3
Fallback: blueprint simplificado se super-page-builder falhar
```

---

### FASE 3 — GERAÇÃO (Etapas 6–8)

**Etapa 6 — Template Selection & Structural Rotation**
```
Agente:   content-writer (coordenado com structureRotation.ts)
Input:    content_blueprint + template_dimension + modo
Output:   selected_template {template_id, variant, anti_pattern_rules}
Timeout:  30s   │  Retries: 2
Fallback: template padrão do nicho
Nota:     structureRotation.ts integrado como operador interno desta etapa
```

**Etapa 7 — Prose Generation**
```
Agente:   content-writer
Skill:    authority-writer-skill + eeat-enrichment-skill
Input:    content_blueprint + selected_template + subconta + niche_profile
Output:   raw_content_document {sections[], word_count, quality_summary}
Timeout:  180s  │  Retries: 2
Fallback: seções com REVIEW_REQUIRED não bloqueiam; ativam section-expansion-skill
```

**Etapa 8 — Humanization & GEO Writing**
```
Agente:   content-writer (coordenado com geoWriterCore.ts)
Skill:    humanization-layer-skill + section-expansion-skill (se necessário)
Input:    raw_content_document + subconta.localidade + subconta.especialização
Output:   humanized_content_document {localidade_signals_injected,
                                       anti_ai_markers_applied}
Timeout:  120s  │  Retries: 2
Fallback: documento sem GEO layer se geoWriterCore indisponível; flag: geo_applied=false
Nota:     geoWriterCore.ts integrado como operador interno desta etapa
```

---

### FASE 4 — VALIDAÇÃO (Etapa 9)

**Etapa 9 — SEO & E-E-A-T Validation** ██ QUALITY GATE ██
```
Agente:   seo-validator
Input:    humanized_content_document + content_blueprint + niche_profile
Output:   validation_report {status, 12_checks, eeat_score, blocking_failures}

STATUS POSSÍVEIS:
  PASS                  → pipeline avança
  PASS_WITH_WARNINGS    → pipeline avança com flags registradas
  FAIL                  → pipeline BLOQUEADO

Timeout:  60s   │  Retries: 3
Fallback: sem fallback — FAIL é definitivo até correção
```

---

### FASE 5 — ASSETS & PUBLICAÇÃO (Etapas 10–12)

**Etapa 10 — Image Strategy**
```
Agente:   image-strategy-agent
Skill:    image-variability-engine
Input:    validated_content_document + niche_profile + usage_history
Output:   image_strategy {featured_image, inline_images[], alt_texts[], entropy_scores}
Timeout:  60s   │  Retries: 2
Fallback: featured image apenas se entropy < threshold em inline
```

**Etapa 11 — Pre-flight Safety Check**
```
Agente:   publisher-agent
Skill:    deployment-safety-guardian
Input:    deployment_package + publish_config + env_var_manifest
Output:   preflight_report {signal: CLEAR|BLOCKED, 5_categories_checked}
Timeout:  45s   │  Retries: 1
Fallback: BLOCKED é definitivo — correção manual requerida
```

**Etapa 12 — Publication & Registry**
```
Agente:   publisher-agent
Input:    validated_content_document + image_strategy + preflight_report (CLEAR)
Output:   publication_record {url, vercel_deployment_id, cluster_updated,
                               link_graph_updated, articles table updated}
Timeout:  90s   │  Retries: 3
Fallback: rollback automático se deploy falhar; retry com exponential backoff
```

---

### Resumo do Pipeline

| Etapa | Nome | Agente | Fase | Gate |
|---|---|---|---|---|
| 1 | SERP Intelligence | research-intel | Inteligência | — |
| 2 | Research Brief | research-intel | Inteligência | — |
| 3 | Cluster & Links | content-architect | Inteligência | — |
| 4 | Structure Validation | content-architect | Arquitetura | Auto-correção |
| 5 | Blueprint Generation | content-architect | Arquitetura | — |
| 6 | Template Selection | content-writer | Geração | — |
| 7 | Prose Generation | content-writer | Geração | Quality flag |
| 8 | Humanization & GEO | content-writer | Geração | — |
| 9 | SEO Validation | seo-validator | Validação | **HARD GATE** |
| 10 | Image Strategy | image-strategy | Assets | Entropy check |
| 11 | Pre-flight Check | publisher | Publicação | **HARD GATE** |
| 12 | Publication | publisher | Publicação | Rollback auto |

---

## 6. TEMPLATES ESTRUTURAIS

Cinco templates com variantes anti-padrão para prevenir repetição estrutural detectável.

### Template 1 — AUTHORITY GUIDE
```
Estrutura canônica:
  H1: [Keyword Principal] — Guia Completo [Ano]
  H2: O que é [Tema] (definição com expertise signal)
  H2: Como funciona [Tema] (mecanismo causal)
  H2: [Benefício Principal] de [Tema]
  H2: Como escolher [Solução] em [Localidade]
  H2: Erros comuns a evitar
  H2: FAQ — [N] perguntas sobre [Tema]
  H2: Conclusão + CTA

Variante anti-padrão A:
  Inverte seções 2 e 3 → começa pelo "como funciona"
  
Variante anti-padrão B:
  Remove seção "erros comuns" → substitui por "casos de uso reais"

Modo ideal: SUPERPAGE, SUPPORTING
Nichos: todos
```

### Template 2 — LOCAL SERVICE
```
Estrutura canônica:
  H1: [Serviço] em [Cidade] — [Empresa/Especialista]
  H2: Por que escolher [Serviço] em [Cidade]
  H2: Nossos serviços de [Especialização]
  H2: Como funciona nosso processo
  H2: Área de atendimento em [Cidade]
  H2: Resultados e casos de clientes
  H2: Perguntas frequentes
  H2: Fale com a [Empresa]

Variante anti-padrão A:
  Área de atendimento sobe para posição 2
  
Variante anti-padrão B:
  Resultados substituídos por "Nossa metodologia"

Modo ideal: SUPERPAGE, CLUSTER
Nichos: advocacia, saúde, contabilidade, imóveis, serviços
```

### Template 3 — PROBLEM-SOLUTION
```
Estrutura canônica:
  H1: [Problema] em [Contexto]? Veja como resolver
  H2: Entenda o problema: [Problema detalhado]
  H2: As causas mais comuns de [Problema]
  H2: Como [Solução] resolve [Problema]
  H2: Passo a passo para [Solução]
  H2: Quando buscar ajuda profissional
  H2: Quanto custa resolver [Problema] em [Localidade]
  H2: FAQ

Variante anti-padrão A:
  Custos sobem para posição 3
  
Variante anti-padrão B:
  "Passo a passo" substituído por "Checklist completo"

Modo ideal: SUPPORTING, FAQ
Nichos: jurídico, saúde, financeiro, tecnologia
```

### Template 4 — COMPARISON
```
Estrutura canônica:
  H1: [Opção A] vs [Opção B]: qual escolher em [Contexto]?
  H2: Visão geral: [Opção A] e [Opção B]
  H2: [Opção A]: vantagens e desvantagens
  H2: [Opção B]: vantagens e desvantagens
  H2: Comparativo direto por critério
  H2: Qual é a melhor opção para [Perfil de usuário]
  H2: Como escolher com segurança
  H2: Nossa recomendação

Variante anti-padrão A:
  Começa pelo comparativo direto, depois detalha cada opção
  
Variante anti-padrão B:
  "Nossa recomendação" substituído por "Casos reais de decisão"

Modo ideal: COMPARISON
Nichos: tecnologia, financeiro, imóveis, jurídico
```

### Template 5 — DEFINITIVE REFERENCE
```
Estrutura canônica:
  H1: [Tema]: tudo o que você precisa saber
  H2: Definição completa de [Tema]
  H2: História e evolução de [Tema]
  H2: Como [Tema] funciona na prática
  H2: Tipos e categorias de [Tema]
  H2: Aplicações e casos de uso
  H2: [Tema] em [Localidade/Contexto específico]
  H2: Recursos e próximos passos
  H2: FAQ enciclopédico

Variante anti-padrão A:
  "História e evolução" removida → substituída por "Mitos e verdades"
  
Variante anti-padrão B:
  "Tipos e categorias" expandida com H3s por subtipo

Modo ideal: SUPERPAGE
Nichos: todos — especialmente educacional e institucional
```

---

## 7. CONFIGURAÇÃO DE NICHOS

13 nichos configurados na tabela `niche_profiles`. Cada nicho define parâmetros específicos que alteram comportamento do Article Engine.

| # | Nicho ID | Vocabulário-chave | E-E-A-T Principal | CTA Padrão |
|---|---|---|---|---|
| 1 | `advocacia` | réu, processo, sentença, prazo | Credencial OAB, experiência | Consulta gratuita |
| 2 | `contabilidade` | CNPJ, MEI, simples nacional, IRPF | CRC ativo, anos de atuação | Análise grátis |
| 3 | `medicina` | diagnóstico, tratamento, CRM, laudo | CRM, especialização, clínica | Agendar consulta |
| 4 | `odontologia` | procedimento, anestesia, plano, clínica | CRO, currículo, equipamentos | Avaliação gratuita |
| 5 | `imóveis` | CRECI, financiamento, laudo, escritura | CRECI, portfólio, avaliações | Visita ao imóvel |
| 6 | `tecnologia` | stack, API, deploy, integração | Cases, certificações, GitHub | Demo / POC |
| 7 | `educação` | MEC, ementa, carga horária, diploma | Cadastro MEC, corpo docente | Inscreva-se |
| 8 | `financeiro` | CVM, CPA, rentabilidade, aporte | CPA-10/20, regulação CVM | Simule agora |
| 9 | `saúde_mental` | CRP, sessão, acolhimento, CAPS | CRP, abordagem, sigilo | Primeira sessão |
| 10 | `engenharia` | CREA, ART, projeto, norma ABNT | CREA, ART assinada, laudos | Solicitar orçamento |
| 11 | `nutrição` | CRN, protocolo, anamnese, macro | CRN, especialização, método | Consulta inicial |
| 12 | `estética` | ANVISA, protocolo, derme, vigilância | ANVISA, curso, clínica | Avaliação grátis |
| 13 | `seguros` | SUSEP, apólice, sinistro, franquia | SUSEP, carteira, seguradoras | Comparar planos |

### Parâmetros por Nicho (estrutura `niche_profile`)

```json
{
  "niche_id": "string",
  "name": "string",
  "regulatory_body": "string | null",
  "vocabulary_set": ["string"],
  "eeat_signals_required": ["credential", "experience", "expertise", "trust"],
  "default_cta_type": "SOFT | HARD",
  "default_cta_text": "string",
  "min_word_count_standard": "integer",
  "tone": "authoritative | empathetic | technical | conversational",
  "local_authority_markers": ["string"],
  "prohibited_claims": ["string"]
}
```

---

## 8. VALIDAÇÃO — CHECKLIST DE 25 PONTOS

Executado pelo `seo-validator` na Etapa 9. Os primeiros 12 são os checks padrão OmniSeen; os 13 adicionais são específicos do Article Engine.

### Checks OmniSeen Padrão (12)

| ID | Check | Blocking |
|---|---|---|
| SEO-C01 | Primary keyword em H1 | ✅ |
| SEO-C02 | Primary keyword em meta title | ✅ |
| SEO-C03 | Meta title: 50–60 chars | ⚠️ |
| SEO-C04 | Meta description: 140–160 chars | ⚠️ |
| SEO-C05 | Keyword density: 0.5–2.5% | ✅ |
| SEO-C06 | Sem H2s duplicados | ✅ |
| SEO-C07 | Word count mínimo atingido (por modo) | ✅ |
| SEO-C08 | E-E-A-T signals presentes conforme blueprint | ✅ |
| SEO-C09 | Links internos presentes e válidos | ⚠️ |
| SEO-C10 | Sem keyword stuffing (> 3%) | ✅ |
| SEO-C11 | Secondary keywords em H2/H3 | ⚠️ |
| SEO-C12 | Semantic keywords no body | ⚠️ |

### Checks Article Engine (13 adicionais)

| ID | Check | Blocking |
|---|---|---|
| AE-C01 | Nicho reconhecido em `niche_profiles` | ✅ |
| AE-C02 | Subconta com localidade definida | ✅ |
| AE-C03 | GEO signals presentes (cidade, região, bairro) | ✅ |
| AE-C04 | Credencial regulatória do nicho mencionada | ✅ |
| AE-C05 | CTA do nicho presente em posição correta | ⚠️ |
| AE-C06 | Template selecionado corresponde ao modo | ✅ |
| AE-C07 | Sem duplicate de template em artigos do mesmo cluster (30d) | ⚠️ |
| AE-C08 | Variante anti-padrão diferente da última publicação | ⚠️ |
| AE-C09 | FAQ presente se modo SUPERPAGE | ✅ |
| AE-C10 | Sem claims proibidos pelo nicho | ✅ |
| AE-C11 | Expertise signal na primeira sentença de cada H2 | ⚠️ |
| AE-C12 | Menção à localidade dentro dos primeiros 200 words | ✅ |
| AE-C13 | Tom consistente com `niche_profile.tone` | ⚠️ |

**Total de checks: 25**
**Checks bloqueantes: 14**
**Checks de warning: 11**

---

## 9. REGRAS DE OURO

Seis princípios invioláveis que nenhuma configuração, template ou instrução pode substituir.

### Regra 1 — Localidade é Obrigatória
```
Todo artigo gerado pelo Article Engine DEVE conter a localidade
dentro dos primeiros 200 words e em pelo menos 1 H2.
Sem localidade = artigo inválido antes de chegar ao SEO validator.
```

### Regra 2 — Credencial Antes de Claim
```
Nenhum claim de autoridade pode preceder a menção da credencial
regulatória do nicho. A credencial deve aparecer antes ou na mesma
sentença que o primeiro claim de expertise.
```

### Regra 3 — Template Rotacionado
```
O mesmo template + variante NÃO pode ser usado em dois artigos
consecutivos do mesmo cluster. O structureRotation.ts é responsável
por garantir esta rotação. Violação = check AE-C08 FAIL.
```

### Regra 4 — E-E-A-T Não é Opcional
```
Os 4 sinais E-E-A-T (Experience, Expertise, Authoritativeness,
Trustworthiness) DEVEM estar presentes em todo artigo de modo
SUPERPAGE. Em SUPPORTING, mínimo 2 sinais obrigatórios.
```

### Regra 5 — GEO Writer Sempre Ativo
```
O geoWriterCore.ts DEVE ser aplicado em toda geração.
Artigos sem GEO layer são publicados com flag geo_applied=false
e marcados para revisão. Nunca são bloqueados — mas são monitorados.
```

### Regra 6 — Gateway SEO é Incontornável
```
Nenhum artigo chega ao publisher-agent sem passar pela Etapa 9
(seo-validator) com status PASS ou PASS_WITH_WARNINGS.
Um FAIL bloqueia o pipeline definitivamente até correção.
Não existe override desta regra — nem por operador, nem por MED.
```

---

## 10. MAPEAMENTO DE COMPONENTES EXISTENTES

Todos os componentes identificados na v1.0.0 são mantidos e integrados ao contrato arquitetural v2.0.

### Frontend (`src/lib/article-engine/`)

| Componente | Status v2.0 | Papel |
|---|---|---|
| `templateSelector.ts` | **Novo (Sprint 2)** | Etapa 6: seleção inteligente de template |
| `structureRotation.ts` | **Integrado** | Etapa 6: operador de rotação anti-padrão |
| Estruturas TypeScript | **Mantidas** | Contratos de tipo para job_request e outputs |

### Backend / Core

| Componente | Status v2.0 | Papel |
|---|---|---|
| `generate-article-structured/index.ts` | **Integrado** | Pipeline principal — coordenado pelo orchestrator |
| `geoWriterCore.ts` | **Integrado** | Etapa 8: operador de localização GEO |

### Supabase

| Tabela | Status v2.0 | Papel |
|---|---|---|
| `niche_profiles` (13+ nichos) | **Expandida** | Fonte de configuração por nicho para todas as etapas |
| `articles` (57 colunas) | **Mantida** | Destino final do publication_record |

### Novas Tabelas Requeridas (v2.0)

| Tabela | Propósito |
|---|---|
| `article_engine_jobs` | Jobs específicos do Article Engine |
| `article_templates_usage` | Rastreamento de rotação de templates |
| `article_validation_reports` | Reports dos 25 checks por artigo |
| `geo_signals_log` | Registro de sinais GEO aplicados |

---

## 11. CONTRATO DE INTERFACES

### Input do Article Engine (via MED)

```json
{
  "job_id": "string (uuid)",
  "subsystem": "article-engine",
  "topic": "string",
  "primary_keyword": "string",
  "target_url_slug": "string",
  "niche_id": "string",
  "subconta": {
    "name": "string",
    "localidade": "string",
    "especialização": "string",
    "credencial": "string"
  },
  "intenção": "INFORMATIONAL | COMMERCIAL | TRANSACTIONAL | NAVIGATIONAL",
  "template_preference": "AUTO | T1 | T2 | T3 | T4 | T5",
  "modo": "SUPERPAGE | SUPPORTING | CLUSTER | FAQ | COMPARISON",
  "content_depth": "SHALLOW | STANDARD | DEEP",
  "publish_immediately": "boolean",
  "requested_by": "string",
  "requested_at": "ISO8601"
}
```

### Output Final do Article Engine

```json
{
  "job_id": "string",
  "status": "PUBLISHED | FAILED | BLOCKED_AT_GATE",
  "article": {
    "url": "string",
    "title": "string",
    "word_count": "integer",
    "template_used": "string",
    "template_variant": "string",
    "geo_applied": "boolean",
    "eeat_score": "integer (0-100)",
    "validation_status": "PASS | PASS_WITH_WARNINGS",
    "cluster_id": "string",
    "cluster_role": "PILLAR | SUPPORTING | BRIDGE",
    "images_count": "integer",
    "internal_links_count": "integer",
    "vercel_deployment_id": "string",
    "published_at": "ISO8601"
  },
  "pipeline_summary": {
    "steps_completed": "integer",
    "steps_total": 12,
    "total_duration_ms": "integer",
    "gate_9_status": "string",
    "gate_11_status": "string"
  }
}
```

---

## 12. ROADMAP DE SPRINTS

Alinhado ao ARCHITECTURE_FULL_INTELLIGENCE_MAP v2.0.

### [2.0.0] — Sprint 1 (ATUAL)
```
✅ Alinhamento arquitetural ao Intelligence Layer
✅ Integração ao contrato MED + Governor
✅ Pipeline de 12 etapas formalizado
✅ 25-point validation checklist
✅ 5 templates com variantes anti-padrão
✅ 13 nichos com niche_profile estruturado
✅ geoWriterCore.ts integrado como Etapa 8
✅ structureRotation.ts integrado como Etapa 6
✅ Registro do subsystem no system-state-governor
```

### [2.1.0] — Sprint 2
```
[ ] templateSelector.ts — seleção automática por topic + niche + modo
[ ] Integração completa com generation-orchestrator (task_dispatch v2)
[ ] Evento lifecycle padronizado para todos os 12 steps
[ ] article_templates_usage table + rotation enforcement
```

### [2.2.0] — Sprint 3
```
[ ] E-E-A-T avançado por nicho (profiles expandidos)
[ ] ALT de imagens contextualizado por nicho + localidade
[ ] entity-coverage-check integrado ao gate Etapa 9
[ ] topical-authority-validator operacional
```

### [2.3.0] — Sprint 4
```
[ ] Interface de preview de template (Frontend)
[ ] Formulário avançado de brief com validação multi-dimensional
[ ] Dashboard de Article Engine no admin
[ ] Métricas de performance por template + nicho
```

### [2.4.0] — Sprint 5
```
[ ] Auto-seleção de modo via lead-intent-detector
[ ] growth-strategy-engine alimentando fila do Article Engine
[ ] Suporte a 20+ nichos
[ ] Batch generation (múltiplos artigos por job)
```

---

## CHANGELOG

### [2.0.0] — 2026-02-28
**Migração arquitetural: subsystem autônomo → Intelligence Layer OmniSeen**

#### Adicionado
- Registro formal do Article Engine como subsystem no system-state-governor
- Integração ao MED como ponto de entrada e controle
- Contrato de lifecycle_events para todos os 12 steps do pipeline
- 13 checks adicionais Article Engine (AE-C01 a AE-C13) ao SEO validator
- Mapeamento explícito de agentes OmniSeen por etapa do pipeline
- Seção de novas tabelas Supabase requeridas
- Contrato formal de Input/Output do subsystem

#### Modificado
- Pipeline de 12 etapas agora mapeado a agentes OmniSeen específicos
- geoWriterCore.ts reclassificado como operador interno da Etapa 8
- structureRotation.ts reclassificado como operador interno da Etapa 6
- Checklist expandido de 12 → 25 pontos
- Roadmap atualizado para 5 sprints com escopo arquitetural

#### Mantido
- Todos os componentes existentes (`generate-article-structured/`, `geoWriterCore.ts`, `structureRotation.ts`)
- 13 nichos configurados em `niche_profiles`
- Tabela `articles` com 57 colunas
- Estruturas TypeScript em `src/lib/article-engine/`
- 6 Regras de Ouro (sem alteração de conteúdo)

---

### [1.0.0] — 2026-01-29
- Documento-mestre inicial com especificação completa
- Arquitetura multi-dimensional (5 dimensões)
- 5 templates estruturais com variantes anti-padrão
- 13 nichos configurados
- Pipeline de 12 etapas
- Checklist de validação de 25 pontos (12 SEO + 13 AE)
- Regras de Ouro (6 princípios)
- Estruturas TypeScript em `src/lib/article-engine/`

---

*Documento mantido em sincronia com `ARCHITECTURE_FULL_INTELLIGENCE_MAP.md`.*
*Toda alteração neste documento deve ser refletida no changelog acima.*
*Localização canônica: `docs/ARTICLE_ENGINE_MASTER.md`*
