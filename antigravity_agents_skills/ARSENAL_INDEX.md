# Antigravity Arsenal: O Repositório Global de Agentes

Este diretório contém o arsenal definitivo de habilidades (skills) e prompts de agentes integrados ao ecossistema do Antigravity. O objetivo é unificar inteligência distribuída em um único local, permitindo que a IA invoque especialistas específicos sob demanda para não estourar o limite de leitura (context window).

## 🗂️ Estrutura do Repositório

*   **`/agency-agents`**
    *   *O que é:* O repositório original com centenas de instruções focadas em funções corporativas.
    *   *Uso:* Quando precisar emular especialistas puros como BDR, DevOps, QA, Design e Marketing.
*   **`/gemini-agency-agents`**
    *   *O que é:* O fork especializado do repositório acima, mas contendo instruções otimizadas para as ferramentas da família Google Gemini.
    *   *Uso:* Quando precisar rodar estas skills nativamente no cli do Gemini.
*   **`/gws-cli`**
    *   *O que é:* A CLI em Rust e os arquivos SKILL.md de interoperabilidade com o Google Workspace (Docs, Drive, Sheets, Gmail).
    *   *Uso:* Para conectar e injetar documentos processados diretamente na nuvem (ex: Google Drive).

## 🚀 Como o Antigravity acessa isso

1.  Este diretório é o **banco de dados estático** (o "Github Local").
2.  Foi criada uma *skill global* no cérebro oculto do Antigravity (`~/.gemini/antigravity/skills/antigravity-global-arsenal`) que o ensina a olhar para cá, não importa qual projeto ele esteja trabalhando.
3.  **Processo de Consulta:** Quando você pedir "Execute a task com o agente de Marketing", o Antigravity virá até o `/gemini-agency-agents/marketing`, lerá o prompt específico (ex: `social-media-strategist.md`) e absorverá aquela expertise temporariamente para agir.

## 📝 Próximos Passos (Integração Google Drive)

Assim que as credenciais primárias da ferramenta `googleworkspace/cli` forem mapeadas, emitiremos o comando para o Agente "subir e formatar" este mapeamento diretamente para uma pasta na sua nuvem Google Drive, gerando a "Wikipédia Privada" da equipe OmniSeen.
