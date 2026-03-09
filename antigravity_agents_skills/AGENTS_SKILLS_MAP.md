# OmniSeen Antigravity: Master Agent & Skills Mapping

Este documento serve como o mapa arquitetônico e sequencial relacionando nossos Agentes (Personas/Especialistas) com suas respectivas Skills (Ferramentas/MCPs). O Antigravity funciona como o Orquestrador Central.

## 1. O Orquestrador (Antigravity Hub)

**Agente:** `Antigravity Master` (Você está aqui)
**Função:** Interpretar a necessidade do usuário, quebrar em tarefas e despachar para os Agentes Especialistas usando suas rotinas.
**Skills Conectadas:**
*   `task_boundary` / `run_command` / `write_to_file`
*   `skill-router` (Identifica qual skill usar)
*   `parallel-agents` (Despacha tarefas múltiplas)

---

## 2. Agentes de Engenharia & Desenvolvimento (Engineering)

Estes agentes focam na construção do motor e da interface.
*Localização: `agency_agents/engineering/` & `gemini_agents/engineering/`*

### Agente: `backend-architect` & `api-developer`
*   **O que faz:** Desenha esquemas de banco de dados (Supabase), constrói funções Deno, gerencia migrações.
*   **Skills Associadas:**
    *   `postgresql-optimization`
    *   `supabase-automation` (MCP Rube)
    *   `api-design-principles`

### Agente: `frontend-developer` & `ui-ux-designer`
*   **O que faz:** Cria os componentes no Lovable/React com alta fidelidade visual (Super Páginas).
*   **Skills Associadas:**
    *   `ui-ux-pro-max` (A base visual premium)
    *   `scroll-experience` (Animações complexas)
    *   `tailwind-design-system`
    *   `figma-automation` (Para ler tokens do Figma)

---

## 3. Agentes de Marketing & Estratégia de Conteúdo

Estes são os motores do OmniSeen e prospecção do Lobo.
*Localização: `agency_agents/marketing/` & `gemini_agents/marketing/`*

### Agente: `growth-hacker` & `seo-specialist`
*   **O que faz:** Desenha a estrutura silo do site, arquitetura de links internos e palavras-chave.
*   **Skills Associadas:**
    *   `seo-structure-architect`
    *   `exa-search` (Busca semântica avançada)
    *   `google-analytics-automation` (Para medir os resultados via GWS)

### Agente: `content-creator` (Section Writer / Blueprint)
*   **O que faz:** Escreve artigos densos e magnéticos focados na dor do cliente.
*   **Skills Associadas:**
    *   `seo-content-writer`
    *   `firecrawl-scraper` (Para raspar os concorrentes Top 1 e roubar a estrutura)
    *   `professional-proofreader` (Revisão final)

### Agente: `social-media-strategist` (O Lobo BDR/SDR)
*   **O que faz:** Planeja outreach, manda mensagens no LinkedIn e emails via fluxo de vendas.
*   **Skills Associadas:**
    *   `sdr-master-closer`
    *   `linkedin-automation` / `linkedin-cli`
    *   `activecampaign-automation` / `mailchimp-automation`

---

## 4. Agentes de Execução & Produtividade (Google Workspace & MCP)

Estes agentes "sujam a mão" nos processos diários da agência e do cliente.
*Localização: Ferramentas nativas do Antigravity*

### Agente: `operations-manager`
*   **O que faz:** Mantém a casa em ordem, agendas atualizadas e relatórios de acompanhamento.
*   **Skills Associadas:**
    *   `google-calendar-automation` (Marcação de check-ins)
    *   `googlesheets-automation` (Geração de relatórios de Leads e ROI)
    *   `google-drive-automation` (Armazenamento de assets e artigos DOCX)
    *   `gmail-automation` (Notificação do cliente quando a Super Página está no ar)

---

## 🔁 Fluxo Sequencial de Execução (O "Caminho Feliz")

Quando um novo projeto de "Super Página OmniSeen" entra, o Antigravity orquestra a banda assim:

1.  **Kickoff (Operações):** Usa `google-drive-automation` para extrair o briefing do cliente da pasta compartilhada.
2.  **Pesquisa (Marketing):** Aciona o `seo-specialist` + `firecrawl-scraper` para mapear os 3 maiores concorrentes e extrair a estrutura H1-H3.
3.  **Redação (Marketing):** O `content-creator` usa `seo-content-writer` para gerar o Markdown final com tabelas e links cruzados.
4.  **Design (Front-End):** O `ui-ux-designer` puxa o `ui-ux-pro-max` para codar o componente React/Lovable com os dados brutos integrados.
5.  **Banco de Dados (Backend):** O `backend-architect` envia a rota e salva o artigo via `supabase-automation`.
6.  **Entrega (Operações):** O `operations-manager` usa `gmail-automation` para notificar a equipe de que a URL está viva.

> *Nota: Os Workspaces do Google Drive / GWS precisam ser autenticados (OAuth local) para garantir que as execuções dos agentes de Operação procedam sem intervenção humana no futuro.*
