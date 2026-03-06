# OMNISEEN — ARCHITECTURE FULL INTELLIGENCE MAP
**Versão:** 2.0.0
**Data:** 2026-02-28
**Localização:** `/docs/architecture/ARCHITECTURE_FULL_INTELLIGENCE_MAP.md`
**Status:** Produção — Documento Canônico

---

## ÍNDICE

1. [Visão Sistêmica](#1-visão-sistêmica)
2. [Mapa de Camadas](#2-mapa-de-camadas)
3. [Diagrama de Fluxo Completo do Sistema](#3-diagrama-de-fluxo-completo-do-sistema)
4. [Diagrama de Fluxo de Governança](#4-diagrama-de-fluxo-de-governança)
5. [Diagrama de Fluxo de Execução de Artigo](#5-diagrama-de-fluxo-de-execução-de-artigo)
6. [Arquitetura de Inteligência](#6-arquitetura-de-inteligência)
7. [Mapa Completo de Agentes por Camada](#7-mapa-completo-de-agentes-por-camada)
8. [Organograma de Autoridade](#8-organograma-de-autoridade)
9. [Matriz de Dependências](#9-matriz-de-dependências)
10. [Infraestrutura de Dados](#10-infraestrutura-de-dados)

---

## 1. VISÃO SISTÊMICA

OmniSeen é um **AI Operating System** para produção autônoma de autoridade orgânica em SEO. Opera como uma plataforma multi-agente com auto-healing, governança centralizada e observabilidade total.

```
╔══════════════════════════════════════════════════════════════════════╗
║                    OMNISEEN — VISÃO SISTÊMICA                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║   ENTRADA            INTELIGÊNCIA           SAÍDA                   ║
║   ─────────          ────────────           ──────                  ║
║   Usuário            MED + Agentes          Artigo publicado        ║
║   Job Request   →    Governor + Pipeline →  URL live no Vercel      ║
║   Topic Input        Skills + Validators    Registro no Supabase    ║
║                                                                      ║
║   CAPACIDADES AUTÔNOMAS:                                             ║
║   ✅ Pesquisa de SERP e inteligência competitiva                     ║
║   ✅ Arquitetura de conteúdo e clusters topicais                     ║
║   ✅ Geração de prosa E-E-A-T autorizada                             ║
║   ✅ Validação SEO com gate de qualidade                             ║
║   ✅ Estratégia visual e anti-footprint                              ║
║   ✅ Deploy automatizado com rollback                                ║
║   ✅ Auto-healing em todos os agentes                                ║
║   ✅ Governança centralizada com máquina de estados                  ║
║   ✅ Observabilidade total com métricas preditivas                   ║
║   ✅ Criação de novos agentes via agent-factory                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 2. MAPA DE CAMADAS

O OmniSeen é organizado em **4 camadas funcionais** que representam a separação de responsabilidades entre interface, inteligência, execução e infraestrutura.

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 4 — INTERFACE LAYER                                     │  ║
║  │  Onde o usuário interage com o sistema                         │  ║
║  │                                                                │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  ║
║  │  │  Frontend    │  │  Dashboard   │  │  Support Interface   │ │  ║
║  │  │  (Next.js)   │  │  Analytics   │  │  (Support Brain)     │ │  ║
║  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │  ║
║  └─────────┼────────────────┼─────────────────────┼─────────────┘  ║
║            │                │                     │                 ║
║            ▼                ▼                     ▼                 ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 3 — INTELLIGENCE LAYER                                  │  ║
║  │  Onde a inteligência artificial opera                          │  ║
║  │                                                                │  ║
║  │  ┌─────────────────────────────────────────────────────────┐  │  ║
║  │  │  MED — Modular Entity Director                          │  │  ║
║  │  │  Ponto de entrada central para toda inteligência        │  │  ║
║  │  └───────────────────────┬─────────────────────────────────┘  │  ║
║  │                          │                                     │  ║
║  │  ┌──────────────┐  ┌─────┴────────┐  ┌──────────────────────┐ │  ║
║  │  │   Governor   │  │  Orchestrator│  │   Agent Factory      │ │  ║
║  │  │  (Layer 0)   │  │  (Layer 2)   │  │   (Intelligence)     │ │  ║
║  │  └──────────────┘  └─────────────┘  └──────────────────────┘ │  ║
║  │                                                                │  ║
║  │  ┌──────────────────────────────────────────────────────────┐ │  ║
║  │  │  PRODUCTION AGENTS (Layer 3)                             │ │  ║
║  │  │  research → architect → writer → validator →             │ │  ║
║  │  │  image-strategy → publisher                              │ │  ║
║  │  └──────────────────────────────────────────────────────────┘ │  ║
║  │                                                                │  ║
║  │  ┌──────────────────────────────────────────────────────────┐ │  ║
║  │  │  OBSERVABILITY AGENTS (Layer 1)                          │ │  ║
║  │  │  health-monitor → event-logger →                         │ │  ║
║  │  │  metrics-collector → alert-dispatcher                    │ │  ║
║  │  └──────────────────────────────────────────────────────────┘ │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║            │                │                     │                 ║
║            ▼                ▼                     ▼                 ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 2 — EXECUTION LAYER                                     │  ║
║  │  Onde o código e lógica de negócio são processados             │  ║
║  │                                                                │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  ║
║  │  │  Core API    │  │  Edge        │  │  Background Jobs     │ │  ║
║  │  │  (Supabase   │  │  Functions   │  │  & Cron              │ │  ║
║  │  │   Edge Fn)   │  │  (Vercel)    │  │  (Scheduler)         │ │  ║
║  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  ║
║  │                                                                │  ║
║  │  ┌──────────────────────────────────────────────────────────┐ │  ║
║  │  │  AI Router — Roteia chamadas entre modelos de IA         │ │  ║
║  │  │  OpenAI / Google Gemini / Embedding Services             │ │  ║
║  │  └──────────────────────────────────────────────────────────┘ │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║            │                │                     │                 ║
║            ▼                ▼                     ▼                 ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 1 — INFRASTRUCTURE LAYER                                │  ║
║  │  Onde os dados e deploys residem                               │  ║
║  │                                                                │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  ║
║  │  │   SUPABASE   │  │   VERCEL     │  │  EXTERNAL PROVIDERS  │ │  ║
║  │  │              │  │              │  │                      │ │  ║
║  │  │  PostgreSQL  │  │  Deployment  │  │  SERP APIs           │ │  ║
║  │  │  Edge Fn     │  │  CDN         │  │  OpenAI              │ │  ║
║  │  │  Realtime    │  │  Edge        │  │  Google Gemini       │ │  ║
║  │  │  Auth        │  │  Functions   │  │  Image Providers     │ │  ║
║  │  │  Storage     │  │  Analytics   │  │  CRM                 │ │  ║
║  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Responsabilidades por Camada

| Camada | Nome | Responsabilidade |
|---|---|---|
| **Layer 4** | Interface Layer | Apresentação, interação do usuário, dashboards, suporte |
| **Layer 3** | Intelligence Layer | Toda lógica de IA, agentes, governança, pipelines |
| **Layer 2** | Execution Layer | APIs, edge functions, roteamento de modelos, jobs |
| **Layer 1** | Infrastructure Layer | Persistência, deploy, providers externos, CDN |

---

## 3. DIAGRAMA DE FLUXO COMPLETO DO SISTEMA

```
╔══════════════════════════════════════════════════════════════════════╗
║         OMNISEEN — FLUXO COMPLETO: USUÁRIO → RESULTADO              ║
╚══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO                                                            │
│                                                                     │
│  Acessa o Frontend (Next.js / Dashboard)                            │
│  Submete: topic, target_url, content_depth, locale                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  HTTP Request / API Call
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND / INTERFACE LAYER                                         │
│                                                                     │
│  ● Valida campos obrigatórios no lado do cliente                    │
│  ● Autentica usuário via Supabase Auth                              │
│  ● Formata payload job_request                                      │
│  ● Envia para Supabase Edge Function                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  POST /api/jobs
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MED — Modular Entity Director                                      │
│  [INTELLIGENCE LAYER — Ponto de Entrada]                            │
│                                                                     │
│  ● Recebe job_request da interface                                  │
│  ● Verifica identidade e permissões do usuário                      │
│  ● Consulta system-state-governor: sistema está HEALTHY?            │
│  ● Valida coerência modular do request                              │
│  ● Roteia para generation-orchestrator                              │
│  ● Registra entrada no event-logger                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  job_request validado
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SYSTEM-STATE-GOVERNOR                                              │
│  [LAYER 0 — Autoridade Máxima]                                      │
│                                                                     │
│  ● Confirma estado do sistema: HEALTHY                              │
│  ● Verifica que Layer 1 e Layer 2 estão operacionais                │
│  ● Autoriza execução do pipeline                                    │
│  ● Emite lifecycle_event: JOB_AUTHORIZED                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  autorização emitida
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GENERATION-ORCHESTRATOR                                            │
│  [LAYER 2 — Pipeline Controller]                                    │
│                                                                     │
│  ● Recebe job_request autorizado                                    │
│  ● Persiste job record no Supabase (omniseen_jobs)                  │
│  ● Verifica disponibilidade dos agentes Layer 3                     │
│  ● Inicia pipeline sequencial (6 steps)                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │     PIPELINE DE PRODUÇÃO         │
              │     (Layer 3 Agents)             │
              │                                  │
              │  STEP 1: research-intelligence   │
              │          ↓                       │
              │  STEP 2: content-architect       │
              │          ↓                       │
              │  STEP 3: content-writer          │
              │          ↓                       │
              │  STEP 4: seo-validator ──[GATE]  │
              │          ↓ (se PASS)             │
              │  STEP 5: image-strategy-agent    │
              │          ↓                       │
              │  STEP 6: publisher-agent         │
              └────────────────┬─────────────────┘
                               │  task_results
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CORE / EXECUTION LAYER                                             │
│                                                                     │
│  ● Supabase Edge Functions processam cada step                      │
│  ● AI Router seleciona modelo por task_type e custo                 │
│  ● Calls para OpenAI / Gemini / Embedding services                  │
│  ● Resultados persistidos no Supabase após cada step                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  pacote final montado
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                           │
│  [INFRASTRUCTURE LAYER — Database]                                  │
│                                                                     │
│  ● omniseen_jobs — registro do job                                  │
│  ● omniseen_job_tasks — steps individuais                           │
│  ● omniseen_content_documents — conteúdo gerado                     │
│  ● omniseen_validation_reports — resultado SEO                      │
│  ● omniseen_publications — registro de publicação                   │
│  ● omniseen_events — audit trail completo                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  deployment trigger
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VERCEL                                                             │
│  [INFRASTRUCTURE LAYER — Deploy]                                    │
│                                                                     │
│  ● publisher-agent aciona Vercel API                                │
│  ● deployment-safety-guardian valida pre-flight                     │
│  ● Page deployed to production environment                          │
│  ● CDN distribui conteúdo globalmente                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  job_completed
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RESULTADO                                                          │
│                                                                     │
│  ✅ Artigo publicado em URL canônica                                │
│  ✅ Registro persistido no Supabase                                 │
│  ✅ Cluster topical atualizado                                      │
│  ✅ Internal link graph atualizado                                  │
│  ✅ Dashboard do usuário atualizado                                 │
│  ✅ Métricas emitidas ao metrics-collector                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. DIAGRAMA DE FLUXO DE GOVERNANÇA

```
╔══════════════════════════════════════════════════════════════════════╗
║         OMNISEEN — FLUXO DE GOVERNANÇA COMPLETO                     ║
╚══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  SYSTEM-STATE-GOVERNOR                                              │
│  [Root Authority — Layer 0]                                         │
│                                                                     │
│  Responsabilidades de governança:                                   │
│  ● Mantém máquina de estados global                                 │
│  ● Registra e desregistra agentes                                   │
│  ● Emite sinais de ativação de camada                               │
│  ● Recebe e processa todos os alertas críticos                      │
│  ● Emite halt_command em caso de falha irrecuperável                │
└────┬──────────┬──────────────────────────────────────────┬──────────┘
     │          │                                          │
     │          │  layer_activation_signal                 │
     │          ▼                                          │
     │  ┌───────────────────────────────────────────┐     │
     │  │  MED — Modular Entity Director             │     │
     │  │  [Intelligence Layer]                      │     │
     │  │                                            │     │
     │  │  ● Recebe sinais do governor               │     │
     │  │  ● Coordena coerência entre entidades      │     │
     │  │  ● Roteia jobs para orchestrator           │     │
     │  │  ● Valida integridade modular em runtime   │     │
     │  └───────┬───────────────────────┬────────────┘     │
     │          │                       │                   │
     │          ▼                       ▼                   │
     │  ┌──────────────┐    ┌──────────────────────────┐   │
     │  │   AGENTES    │    │    AGENT-FACTORY          │   │
     │  │  (Layer 1-3) │    │                          │   │
     │  │              │    │  ● Cria novos agentes    │   │
     │  │  Executam    │    │  ● Valida estrutura       │   │
     │  │  suas        │    │  ● Registra no governor  │   │
     │  │  missões     │    │  ● Audita /ai/agents/     │   │
     │  └──────┬───────┘    └──────────────────────────┘   │
     │         │                                            │
     │         │  omniseen.* events (todas as ações)        │
     │         ▼                                            │
     │  ┌────────────────────────────────────────────┐     │
     │  │  EVENT-LOGGER                              │     │
     │  │  [Layer 1 — Auditoria Imutável]            │     │
     │  │                                            │     │
     │  │  ● Captura 100% dos eventos do sistema     │     │
     │  │  ● Enriquece com sequence_number           │     │
     │  │  ● Persiste append-only no Supabase        │     │
     │  │  ● Mantém dead-letter para inválidos       │     │
     │  └──────────────────────┬─────────────────────┘     │
     │                         │  métricas derivadas        │
     │                         ▼                            │
     │  ┌────────────────────────────────────────────┐     │
     │  │  AI ROUTER                                 │     │
     │  │  [Execution Layer]                         │     │
     │  │                                            │     │
     │  │  ● Roteia chamadas de IA por task_type     │     │
     │  │  ● Aplica cost-quality matrix              │     │
     │  │  ● Executa failover entre providers        │     │
     │  │  ● Aplica ai-cost-optimizer                │     │
     │  │  ● Monitora via provider-health-monitor    │     │
     │  └──────────────────────┬─────────────────────┘     │
     │                         │  health signals            │
     │                         ▼                            │
     │  ┌────────────────────────────────────────────┐     │
     │  │  HEALTH MONITOR                            │     │
     │  │  [Layer 1 — Liveness Authority]            │     │
     │  │                                            │     │
     │  │  ● Probe de liveness a cada 30s            │     │
     │  │  ● Probe de readiness a cada 30s           │     │
     │  │  ● Heartbeat a cada 15s por agente         │     │
     │  │  ● Escala miss > 3x ao governor            │     │
     │  └──────────────────────┬─────────────────────┘     │
     │                         │  anomaly_signals           │
     │                         ▼                            │
     │  ┌────────────────────────────────────────────┐     │
     │  │  METRICS-COLLECTOR + ALERT-DISPATCHER      │     │
     │  │  [Layer 1 — Telemetria e Alertas]          │     │
     │  │                                            │     │
     │  │  metrics-collector:                        │     │
     │  │  ● Agrega métricas em 4 janelas            │     │
     │  │  ● Detecta anomalias por desvio            │     │
     │  │  ● Prediz falhas antes do breach           │     │
     │  │                                            │     │
     │  │  alert-dispatcher:                         │     │
     │  │  ● Avalia 12 regras de alerta              │     │
     │  │  ● Deduplica e previne flapping            │     │
     │  │  ● Zero supressão para CRITICAL            │     │
     │  └──────────────────────┬─────────────────────┘     │
     │                         │  alerts (WARN/HIGH/CRIT)   │
     └─────────────────────────┴────────────────────────────┘
                               │
                               ▼
              GOVERNOR recebe alert e decide:
              ┌──────────────────────────────────────┐
              │  INFO/WARNING  → log only            │
              │  HIGH          → DEGRADED state      │
              │  CRITICAL      → RECOVERY ou HALTED  │
              └──────────────────────────────────────┘
```

### Ciclo de Governança (resumido)

```
Governor → ativa camadas → agentes operam
Agentes → emitem heartbeats → health-monitor coleta
Agentes → emitem events → event-logger persiste
Events → métricas derivadas → metrics-collector agrega
Métricas → anomalias → alert-dispatcher avalia
Alertas → governor decide → Recovery / Degraded / Halted
Governor → emite recovery_command → agente cura
Agente curado → HEALTHY → governor atualiza estado
```

---

## 5. DIAGRAMA DE FLUXO DE EXECUÇÃO DE ARTIGO

```
╔══════════════════════════════════════════════════════════════════════╗
║       OMNISEEN — PIPELINE COMPLETO DE PRODUÇÃO DE ARTIGO            ║
╚══════════════════════════════════════════════════════════════════════╝

  INPUT
  ─────
  topic: "Advocacia Trabalhista em São Paulo"
  job_type: SUPERPAGE
  content_depth: DEEP
  locale: pt-BR
  target_url: /advocacia-trabalhista-sp

         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  generation-orchestrator                                         │
│  Persiste job → Verifica Layer 3 → Inicia pipeline              │
└──────────────────────────────┬───────────────────────────────────┘
                               │
  ┌────────────────────────────▼───────────────────────────────────┐
  │                                                                 │
  │  ╔═══════════════════════════════════════════════════════════╗  │
  │  ║  STEP 1 — research-intelligence-agent                    ║  │
  │  ╠═══════════════════════════════════════════════════════════╣  │
  │  ║                                                           ║  │
  │  ║  Skills ativas:                                           ║  │
  │  ║  → serp-intelligence-analyzer                            ║  │
  │  ║  → lead-intent-detector                                  ║  │
  │  ║                                                           ║  │
  │  ║  Ações:                                                   ║  │
  │  ║  1. Consulta SERP para "advocacia trabalhista SP"         ║  │
  │  ║  2. Analisa top-10 resultados orgânicos                  ║  │
  │  ║  3. Classifica intenção: 70% informacional, 30% comercial ║  │
  │  ║  4. Detecta gaps: sem conteúdo sobre rescisão indireta   ║  │
  │  ║  5. Mapeia clusters: direitos, processos, custos, prazo  ║  │
  │  ║  6. Identifica BOFU keywords → envia ao CRM              ║  │
  │  ║                                                           ║  │
  │  ║  OUTPUT: research_brief                                   ║  │
  │  ╚═══════════════════════════════════════════════════════════╝  │
  │                               │                                 │
  │  ╔════════════════════════════▼══════════════════════════════╗  │
  │  ║  STEP 2 — content-architect                               ║  │
  │  ╠═══════════════════════════════════════════════════════════╣  │
  │  ║                                                           ║  │
  │  ║  Skills ativas:                                           ║  │
  │  ║  → article-structure-intelligence                        ║  │
  │  ║  → super-page-builder                                    ║  │
  │  ║  → content-cluster-orchestrator                          ║  │
  │  ║  → internal-link-architect                               ║  │
  │  ║                                                           ║  │
  │  ║  Ações:                                                   ║  │
  │  ║  1. Verifica: job_type = SUPERPAGE → role = PILLAR        ║  │
  │  ║  2. Define H1: "Advocacia Trabalhista em SP: Guia 2026"  ║  │
  │  ║  3. Define 8 H2s + H3s aninhados                         ║  │
  │  ║  4. Posiciona CTA_PRIMARY após seção 3                    ║  │
  │  ║  5. Mapeia 12 FAQs para featured snippets                 ║  │
  │  ║  6. Define 5 links internos inbound + 7 outbound          ║  │
  │  ║  7. Verifica cannibalization: nenhum conflito            ║  │
  │  ║                                                           ║  │
  │  ║  OUTPUT: content_blueprint (SuperPage spec)               ║  │
  │  ╚═══════════════════════════════════════════════════════════╝  │
  │                               │                                 │
  │  ╔════════════════════════════▼══════════════════════════════╗  │
  │  ║  STEP 3 — content-writer                                  ║  │
  │  ╠═══════════════════════════════════════════════════════════╣  │
  │  ║                                                           ║  │
  │  ║  Skills ativas:                                           ║  │
  │  ║  → authority-writer-skill                                ║  │
  │  ║  → eeat-enrichment-skill                                 ║  │
  │  ║  → humanization-layer-skill                              ║  │
  │  ║  → section-expansion-skill (se necessário)               ║  │
  │  ║                                                           ║  │
  │  ║  Ações:                                                   ║  │
  │  ║  1. Gera prosa seção por seção (expertise-first)          ║  │
  │  ║  2. Injeta sinais E-E-A-T nos pontos definidos            ║  │
  │  ║  3. Aplica variação de ritmo de sentença                  ║  │
  │  ║  4. Verifica density de claims por 100 palavras           ║  │
  │  ║  5. Aplica humanization layer (anti-AI detectável)        ║  │
  │  ║  6. Total: ~4.200 palavras geradas                        ║  │
  │  ║                                                           ║  │
  │  ║  OUTPUT: content_document (4.200 palavras, markdown)      ║  │
  │  ╚═══════════════════════════════════════════════════════════╝  │
  │                               │                                 │
  │  ╔════════════════════════════▼══════════════════════════════╗  │
  │  ║  STEP 4 — seo-validator                    ██ GATE ██     ║  │
  │  ╠═══════════════════════════════════════════════════════════╣  │
  │  ║                                                           ║  │
  │  ║  12 checks executados:                                    ║  │
  │  ║  SEO-C01 ✅ Primary keyword em H1                         ║  │
  │  ║  SEO-C02 ✅ Primary keyword em meta title                 ║  │
  │  ║  SEO-C03 ✅ Meta title: 57 chars                          ║  │
  │  ║  SEO-C04 ✅ Meta description: 152 chars                   ║  │
  │  ║  SEO-C05 ✅ Keyword density: 1.8%                         ║  │
  │  ║  SEO-C06 ✅ H2s sem duplicatas                            ║  │
  │  ║  SEO-C07 ✅ Word count: 4.200 (min DEEP: 3.500) ✅        ║  │
  │  ║  SEO-C08 ✅ E-E-A-T signals presentes                     ║  │
  │  ║  SEO-C09 ⚠️  Links internos: 4/5 resolvidos               ║  │
  │  ║  SEO-C10 ✅ Sem keyword stuffing                          ║  │
  │  ║  SEO-C11 ✅ Secondary keywords em H2/H3                   ║  │
  │  ║  SEO-C12 ✅ Semantic keywords no body                     ║  │
  │  ║                                                           ║  │
  │  ║  STATUS: PASS_WITH_WARNINGS — pipeline continua           ║  │
  │  ║                                                           ║  │
  │  ║  OUTPUT: validated_content_document                       ║  │
  │  ╚═══════════════════════════════════════════════════════════╝  │
  │                               │                                 │
  │  ╔════════════════════════════▼══════════════════════════════╗  │
  │  ║  STEP 5 — image-strategy-agent                            ║  │
  │  ╠═══════════════════════════════════════════════════════════╣  │
  │  ║                                                           ║  │
  │  ║  Skills ativas:                                           ║  │
  │  ║  → image-variability-engine                              ║  │
  │  ║                                                           ║  │
  │  ║  Ações:                                                   ║  │
  │  ║  1. Define featured image (PHOTO, 1200x630)               ║  │
  │  ║  2. Define 3 inline images:                               ║  │
  │  ║     - Seção "Direitos do Trabalhador" → INFOGRAPHIC        ║  │
  │  ║     - Seção "Como funciona o processo" → DIAGRAM          ║  │
  │  ║     - Seção "Custos" → CHART                              ║  │
  │  ║  3. Verifica usage_history: sem repetição (30 dias)       ║  │
  │  ║  4. Entropy scores: 0.82, 0.79, 0.88, 0.91               ║  │
  │  ║  5. Gera alt texts WCAG 2.1 compliant                     ║  │
  │  ║                                                           ║  │
  │  ║  OUTPUT: image_strategy (4 imagens especificadas)         ║  │
  │  ╚═══════════════════════════════════════════════════════════╝  │
  │                               │                                 │
  │  ╔════════════════════════════▼══════════════════════════════╗  │
  │  ║  STEP 6 — publisher-agent                  ██ TERMINAL ██ ║  │
  │  ╠═══════════════════════════════════════════════════════════╣  │
  │  ║                                                           ║  │
  │  ║  Skill ativa:                                             ║  │
  │  ║  → deployment-safety-guardian (pre-flight)               ║  │
  │  ║                                                           ║  │
  │  ║  Pre-flight checks:                                       ║  │
  │  ║  CATEGORIA 1: ENV VARS ✅                                  ║  │
  │  ║  CATEGORIA 2: ROUTES ✅ (slug único)                       ║  │
  │  ║  CATEGORIA 3: AUTH ✅                                      ║  │
  │  ║  CATEGORIA 4: MIGRATIONS ✅ (nenhuma pendente)             ║  │
  │  ║  CATEGORIA 5: VERCEL CONFIG ✅                             ║  │
  │  ║                                                           ║  │
  │  ║  Signal: CLEAR → deploy autorizado                        ║  │
  │  ║                                                           ║  │
  │  ║  Deploy steps:                                            ║  │
  │  ║  1. Monta MDX com headings, links, CTAs                   ║  │
  │  ║  2. Injeta meta tags + canonical URL                      ║  │
  │  ║  3. Injeta image placeholders + alt texts                 ║  │
  │  ║  4. Aciona Vercel API → deployment ID gerado              ║  │
  │  ║  5. Persiste publication_record no Supabase               ║  │
  │  ║  6. Registra URL no content_registry                      ║  │
  │  ║  7. Atualiza cluster_map (nova página PILLAR)             ║  │
  │  ║  8. Atualiza link_graph (12 directives aplicadas)         ║  │
  │  ║                                                           ║  │
  │  ║  OUTPUT: job_completed + URL live                         ║  │
  │  ╚═══════════════════════════════════════════════════════════╝  │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  RESULTADO FINAL                                             │
  │                                                              │
  │  URL publicada:  /advocacia-trabalhista-sp                   │
  │  Palavras:       4.200                                       │
  │  Validação SEO:  PASS_WITH_WARNINGS                          │
  │  E-E-A-T Score:  87/100                                      │
  │  Imagens:        4 (featured + 3 inline)                     │
  │  Links internos: 12 directives aplicadas                     │
  │  Cluster:        PILLAR criado                               │
  │  Supabase:       publication_record persistido               │
  │  CRM:            3 BOFU signals enviados                     │
  └──────────────────────────────────────────────────────────────┘
```

---

## 6. ARQUITETURA DE INTELIGÊNCIA

```
╔══════════════════════════════════════════════════════════════════════╗
║              OMNISEEN — ARQUITETURA DE INTELIGÊNCIA                 ║
╚══════════════════════════════════════════════════════════════════════╝

  CAMADA DE INTELIGÊNCIA
  ────────────────────────────────────────────────────────────────────

  ┌────────────────────────────────────────────────────────────────┐
  │  MED (Modular Entity Director)                                 │
  │  Coordenador central de toda inteligência                      │
  │  Recebe da interface → valida → roteia → reporta               │
  └───────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
  ┌──────────────────┐ ┌─────────────┐ ┌──────────────────┐
  │ system-state-    │ │  generation-│ │  agent-factory   │
  │ governor         │ │ orchestrator│ │                  │
  │                  │ │             │ │  Cria agentes    │
  │  Governa estado  │ │  Orquestra  │ │  Valida padrão   │
  │  Ativa camadas   │ │  pipelines  │ │  Audita /agents/ │
  └──────────────────┘ └──────┬──────┘ └──────────────────┘
                              │
         ┌────────────────────┼─────────────────────────┐
         │                    │                         │
         ▼                    ▼                         ▼
  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐
  │  RESEARCH    │   │  ARCHITECTURE    │   │  VALIDATION &      │
  │  CLUSTER     │   │  CLUSTER         │   │  DELIVERY CLUSTER  │
  │              │   │                  │   │                    │
  │  research-   │   │  content-        │   │  seo-validator     │
  │  intelligence│   │  architect       │   │  image-strategy    │
  │  agent       │   │                  │   │  publisher-agent   │
  │              │   │  content-writer  │   │                    │
  └──────┬───────┘   └──────────────────┘   └────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  SKILLS LAYER (transversal — usada por todos os agentes)     │
  │                                                              │
  │  Research:      serp-intelligence-analyzer                   │
  │                 lead-intent-detector                         │
  │                 growth-strategy-engine                       │
  │                                                              │
  │  Architecture:  article-structure-intelligence              │
  │                 super-page-builder                           │
  │                 content-cluster-orchestrator                 │
  │                 internal-link-architect                      │
  │                                                              │
  │  Writing:       authority-writer-skill                       │
  │                 eeat-enrichment-skill                        │
  │                 humanization-layer-skill                     │
  │                 section-expansion-skill                      │
  │                                                              │
  │  Validation:    seo-score-analyzer                           │
  │                 entity-coverage-check                        │
  │                 topical-authority-validator                  │
  │                                                              │
  │  Visual:        image-variability-engine                     │
  │                                                              │
  │  Infrastructure: ai-cost-optimizer                           │
  │                  provider-health-monitor                     │
  │                  deployment-safety-guardian                  │
  │                  system-anomaly-predictor                    │
  │                                                              │
  │  Support:       omniseen-support-brain                       │
  │                 onboarding-flow-orchestrator                 │
  └──────────────────────────────────────────────────────────────┘
```

---

## 7. MAPA COMPLETO DE AGENTES POR CAMADA

```
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 0 — GOVERNANCE (1 agente)                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  system-state-governor  │ Root Authority  │ CRITICAL  │ AUTO-HEAL  ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 1 — OBSERVABILITY (4 agentes)                                ║
╠══════════════════════════════════════════════════════════════════════╣
║  health-monitor         │ Liveness        │ CRITICAL  │ AUTO-HEAL  ║
║  event-logger           │ Audit           │ CRITICAL  │ AUTO-HEAL  ║
║  metrics-collector      │ Telemetry       │ CRITICAL  │ AUTO-HEAL  ║
║  alert-dispatcher       │ Anomaly Router  │ CRITICAL  │ AUTO-HEAL  ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 2 — ORCHESTRATION (1 agente)                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  generation-orchestrator│ Pipeline Ctrl   │ CRITICAL  │ AUTO-HEAL  ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 3 — PRODUCTION (6 agentes)                                   ║
╠══════════════════════════════════════════════════════════════════════╣
║  research-intel-agent   │ SERP/Research   │ optional  │ AUTO-HEAL  ║
║  content-architect      │ Structure       │ optional  │ AUTO-HEAL  ║
║  content-writer         │ Prose Gen       │ optional  │ AUTO-HEAL  ║
║  seo-validator          │ Quality Gate    │ optional  │ AUTO-HEAL  ║
║  image-strategy-agent   │ Visual Spec     │ optional  │ AUTO-HEAL  ║
║  publisher-agent        │ Deploy          │ optional  │ AUTO-HEAL  ║
╠══════════════════════════════════════════════════════════════════════╣
║  INTELLIGENCE LAYER (2 agentes)                                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  agent-factory          │ Struct Orch     │ HIGH auth │ AUTO-HEAL  ║
║  med                    │ Entity Coord    │ HIGH auth │ AUTO-HEAL  ║
╚══════════════════════════════════════════════════════════════════════╝

  TOTAL: 14 agentes │ 15+ skills │ 30+ tabelas Supabase
```

---

## 8. ORGANOGRAMA DE AUTORIDADE

```
                    ╔══════════════════════════════╗
                    ║   system-state-governor      ║
                    ║   AUTORIDADE MÁXIMA          ║
                    ║   Layer 0 — Root             ║
                    ╚══════════════┬═══════════════╝
                                   │
           ┌───────────────────────┼────────────────────────┐
           │                       │                        │
           ▼                       ▼                        ▼
    ╔═════════════╗        ╔══════════════╗         ╔═════════════╗
    ║  MED        ║        ║  LAYER 1     ║         ║  agent-     ║
    ║  Intel.     ║        ║  OBSERV.     ║         ║  factory    ║
    ║  Layer      ║        ║  (4 agents)  ║         ║  Intel.Lyr  ║
    ╚══════╤══════╝        ╚══════╤═══════╝         ╚═════════════╝
           │                      │
           ▼                      ▼
    ╔═════════════╗        ╔══════════════╗
    ║  generation-║        ║ alert-disp.  ║
    ║orchestrator ║        ║ (Layer 1     ║
    ║  Layer 2    ║        ║  terminal)   ║
    ╚══════╤══════╝        ╚══════════════╝
           │
    ┌──────┴──────────────────────────────────────┐
    │              LAYER 3 AGENTS                 │
    │                                             │
    │  research  →  architect  →  writer          │
    │                              ↓              │
    │              validator  ←────┘              │
    │                  ↓                          │
    │            image-strategy                   │
    │                  ↓                          │
    │             publisher ──→ job_completed     │
    └─────────────────────────────────────────────┘

  LEGENDA DE AUTORIDADE:
  ╔══╗ Alta autoridade (pode alterar estado global ou bloquear)
  ┌──┐ Autoridade operacional (executa dentro do seu escopo)
```

---

## 9. MATRIZ DE DEPENDÊNCIAS

| Agente | Depende de | Bloqueia se falhar |
|---|---|---|
| system-state-governor | — | Todos os agentes |
| health-monitor | governor | event-logger, metrics-collector, alert-dispatcher |
| event-logger | governor, health-monitor | metrics-collector |
| metrics-collector | governor, health-monitor, event-logger | alert-dispatcher |
| alert-dispatcher | governor, health-monitor, metrics-collector | generation-orchestrator (via governor) |
| generation-orchestrator | governor, todos Layer 1 | Todos Layer 3 |
| research-intel-agent | generation-orchestrator | content-architect |
| content-architect | generation-orchestrator, research-intel | content-writer |
| content-writer | generation-orchestrator, content-architect | seo-validator |
| seo-validator | generation-orchestrator, content-writer | image-strategy-agent |
| image-strategy-agent | generation-orchestrator, seo-validator | publisher-agent |
| publisher-agent | generation-orchestrator, seo-validator, image-strategy | job_completed |
| agent-factory | governor, event-logger | — |
| med | governor, agent-factory | Entrada de novos jobs |

---

## 10. INFRAESTRUTURA DE DADOS

```
╔══════════════════════════════════════════════════════════════════════╗
║              SUPABASE — TABELAS PRINCIPAIS POR DOMÍNIO              ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  GOVERNANCE                    OBSERVABILITY                        ║
║  ─────────────────────         ───────────────────────────          ║
║  omniseen_system_state         omniseen_agent_health                ║
║  omniseen_agent_registry       omniseen_probe_results               ║
║  omniseen_lifecycle_events     omniseen_health_snapshots            ║
║  omniseen_state_snapshots      omniseen_events (append-only)        ║
║                                omniseen_events_dead_letter          ║
║                                omniseen_metrics_60s                 ║
║                                omniseen_metrics_5m                  ║
║                                omniseen_metrics_1h                  ║
║                                omniseen_metrics_24h                 ║
║                                omniseen_alerts_active               ║
║                                omniseen_alerts_history              ║
║                                omniseen_anomaly_signals             ║
║                                                                      ║
║  PRODUCTION PIPELINE           CONTENT & SEO                        ║
║  ─────────────────────         ────────────────────────             ║
║  omniseen_jobs                 omniseen_serp_cache                  ║
║  omniseen_job_tasks            omniseen_research_briefs             ║
║  omniseen_job_outputs          omniseen_content_blueprints          ║
║                                omniseen_content_documents           ║
║  PUBLISHING                    omniseen_validation_reports          ║
║  ─────────────────────         omniseen_cluster_map                 ║
║  omniseen_publications         omniseen_content_registry            ║
║  omniseen_content_registry     omniseen_link_graph                  ║
║  omniseen_deployment_history   omniseen_image_strategies            ║
║  omniseen_preflight_reports    omniseen_image_usage_history         ║
║                                                                      ║
║  COST & PROVIDERS              USERS & SUPPORT                      ║
║  ─────────────────────         ────────────────────────             ║
║  omniseen_model_usage_log      omniseen_users                       ║
║  omniseen_cost_summaries       omniseen_onboarding_events           ║
║  omniseen_provider_status      omniseen_knowledge_base              ║
║  omniseen_routing_history      omniseen_support_interactions        ║
║                                omniseen_crm_signal_buffer           ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Fluxo de Dados (resumido)

```
Usuário → Frontend
       → Supabase Auth (valida)
       → Edge Function (processa)
       → MED (roteia)
       → Governor (autoriza)
       → Orchestrator (enfileira)
       → Agentes Layer 3 (executam)
       → Supabase (persiste cada step)
       → Vercel (deploy)
       → omniseen_publications (registro final)
       → event-logger (audit trail)
       → metrics-collector (telemetria)
       → Dashboard do usuário (resultado)
```

---

## APÊNDICE — REFERÊNCIA RÁPIDA

### Boot Protocol Sequencial

```
1. boot_signal emitido pelo Runtime
2. system-state-governor: BOOTING → HEALTHY
3. layer_activation_signal → Layer 1
4. health-monitor, event-logger, metrics-collector, alert-dispatcher: boot + register
5. layer_activation_signal → Layer 2
6. generation-orchestrator: boot + register
7. layer_activation_signal → Layer 3
8. Todos Layer 3 agents: boot + register
9. Sistema: OPERATIONAL
```

### Ciclos Temporais de Operação

| Ciclo | Frequência | Responsável |
|---|---|---|
| Heartbeat collection | 15s | health-monitor |
| Liveness + readiness probe | 30s | health-monitor |
| Metric aggregation (fast) | 60s | metrics-collector |
| Alert rule evaluation | 60s | alert-dispatcher |
| Anomaly prediction | 15min | system-anomaly-predictor |
| Metric aggregation (mid) | 5min | metrics-collector |
| Growth roadmap review | 7 days | growth-strategy-engine |
| Agent audit | 24h | agent-factory |
| State snapshot persist | 5min | system-state-governor |

### Códigos de Estado Global

| Estado | Significado | Origem |
|---|---|---|
| `BOOTING` | Sistema inicializando | boot_signal |
| `HEALTHY` | Todos os checks passam | Self-check |
| `DEGRADED` | Falha não-crítica ativa | failure_report LOW/MED |
| `RECOVERY` | Auto-heal em execução | alert CRITICAL |
| `HALTED` | Falha irrecuperável | max retries exceeded |

---

*Documento gerado e mantido pelo OmniSeen Architecture Registry.*
*Atualizar sempre que um novo agente for criado via agent-factory.*
*Localização canônica: `/docs/architecture/ARCHITECTURE_FULL_INTELLIGENCE_MAP.md`*
