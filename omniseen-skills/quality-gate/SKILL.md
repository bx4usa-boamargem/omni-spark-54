# SKILL: quality-gate

## Finalidade
Step 6 e último de validação de todo pipeline de geração. Executa 4 verificações críticas em sequência: (1) anti-alucinação, (2) anti-duplicação, (3) validação de estrutura e (4) validação de prova. Se alguma verificação crítica falha e não tem fix automático, bloqueia publicação e emite job_event com reason.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- longform-article-orchestrator (step 6, OBRIGATÓRIO)
- superpage-orchestrator (step 9, OBRIGATÓRIO)
- content-refresh-agent (ao publicar versão atualizada)

## Inputs
```json
{
  "content_type": "blog | super_page",
  "content_html": "string",
  "content_json": "object",
  "keyword": "string",
  "outline": "<outline gerado pelo outline-step>",
  "tenant_id": "uuid",
  "web_research_enabled": "boolean",
  "locale": "pt-BR | en-US",
  "is_local_page": "boolean — super pages de serviço local",
  "existing_content_sample": ["string — excerpts de outros conteúdos do tenant para comparação"],
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "passed": "boolean",
  "checks": {
    "anti_hallucination": {
      "passed": "boolean",
      "issues": ["string"],
      "auto_fixed": "boolean",
      "severity": "blocker | warning | info"
    },
    "anti_duplication": {
      "passed": "boolean",
      "similarity_score": "float 0-1",
      "most_similar_content_id": "uuid | null",
      "severity": "blocker | warning | info"
    },
    "structure_validation": {
      "passed": "boolean",
      "missing_sections": ["string"],
      "heading_issues": ["string"],
      "word_count_ok": "boolean",
      "severity": "blocker | warning | info"
    },
    "proof_validation": {
      "passed": "boolean",
      "unverified_claims": ["string"],
      "missing_proof_elements": ["string"],
      "severity": "blocker | warning | info"
    }
  },
  "content_html_fixed": "string | null — HTML com fixes automáticos aplicados",
  "overall_score": "int 0-100",
  "publish_recommended": "boolean",
  "block_reason": "string | null"
}
```

## CHECK 1 — Anti-Alucinação
Regras:
1. Buscar padrões: "X% dos brasileiros", "segundo estudo de YEAR", "a empresa tem X anos", "certificado por [órgão]".
2. Se web_research_enabled = false: REMOVER ou NEUTRALIZAR qualquer estatística sem fonte no texto.
3. Se web_research_enabled = true: verificar se estatística tem URL no research_json — se não, remover.
4. Para páginas locais (is_local_page = true): NUNCA aceitar preço inventado, anos de mercado inventados, certificações não verificadas, reviews não verificados.
5. Auto-fix: substituir "X anos de experiência" por "anos de experiência no mercado" quando não verificado.
6. Auto-fix: remover parágrafos com estatísticas sem fonte quando web=false.
7. Se issue crítica sem auto-fix possível: severity = blocker.

## CHECK 2 — Anti-Duplicação
Regras:
1. Calcular similaridade semântica entre o conteúdo novo e existing_content_sample do tenant.
2. Similaridade > 0.80: BLOCKER — não publicar. Conteúdo é duplicata interna.
3. Similaridade 0.60–0.80: WARNING — logar, mas permitir publicação com job_event.
4. Similaridade < 0.60: PASS.
5. Foco em intro + headings + conclusão (não comparar todo o HTML).

## CHECK 3 — Validação de Estrutura
Regras:
1. Verificar se todas as seções obrigatórias do outline estão presentes.
2. Verificar se headings H1 existe (exatamente 1).
3. Verificar word_count dentro do range aceitável (85%–120% do target).
4. Para intent=local: verificar presença de nome da cidade/região em ao menos 3 headings ou parágrafos principais.
5. Para intent=local: verificar presença de CTA com contato.
6. Heading quality: sem H2 duplicados semanticamente.
7. Seção FAQ: se paa_questions foram definidas, ao menos 3 perguntas devem estar no conteúdo.

## CHECK 4 — Validação de Prova
Regras:
1. Para super_page local: verificar presença de ao menos 1 elemento de prova (depoimento real, processo documentado, ou declaração de garantia verificável).
2. Prova inventada (review genérico de "cliente feliz" sem nome/contexto): BLOCKER.
3. Se business_profile disponível e tem dados de prova: verificar se foram usados.
4. Se sem dados de prova: aceitar linguagem de garantia genérica verificável ("garantia de serviço", "retorno gratuito em X dias").

## Validações obrigatórias
- [ ] Todos os 4 checks executados — nenhum pode ser pulado
- [ ] Se passed=false E severity=blocker: job deve ir para status=failed
- [ ] block_reason deve ser preenchido quando passed=false
- [ ] ai_run_step criado com resultado de cada check
- [ ] Se auto_fixed=true: content_html_fixed retornado e usado downstream

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "quality-gate",
  "agent_key": "longform-article-orchestrator | superpage-orchestrator",
  "input_json": { "content_type": "...", "keyword": "...", "web_research": "bool" },
  "output_json": { "passed": "bool", "overall_score": "int", "blockers": ["string"] },
  "status": "done | failed | warn"
}
```

## Persistência no Supabase
- INSERT em `ai_run_steps` com resultado completo de todos os checks
- Se blocker: UPDATE `jobs` SET status='failed', error_json=<block_reason>
- Emitir job_event PARA CADA CHECK: `{ event_type: "step_completed | warn | error", message: "quality-gate: check=anti_hallucination, passed=true" }`
- Se auto_fixed: emitir job_event info: `{ message: "quality-gate: auto-fix aplicado em 2 estatísticas sem fonte" }`
