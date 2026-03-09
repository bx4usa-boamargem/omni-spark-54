# OmniSeen Skills Package — Motor Blueprint v1.0

**31 skills executáveis para o Antigravity instalar.**

## Estrutura de Motores

### MOTOR 1 — DECISÃO (4 skills)
| Skill | Agente Principal |
|---|---|
| intent-cluster-builder | market-radar-agent |
| strategic-value-scorer | market-radar-agent |
| mix-policy-engine | content-planner-agent |
| backlog-prioritizer | content-planner-agent |

### MOTOR 2 — RADAR (5 skills)
| Skill | Agente Principal |
|---|---|
| keyword-gap-analyzer | market-radar-agent |
| top-serp-diff | serp-intelligence-agent |
| paa-and-forum-miner | serp-intelligence-agent |
| competitor-change-monitor | market-radar-agent |
| geo-keyword-expander | market-radar-agent |

### MOTOR 3 — GERAÇÃO ARTIGO (6 skills)
| Skill | Agente Principal |
|---|---|
| research-step | longform-article-orchestrator |
| outline-step | longform-article-orchestrator |
| article-draft-composer | longform-article-orchestrator |
| seo-enrichment-step | longform-article-orchestrator |
| internal-link-suggester | longform-article-orchestrator |
| quality-gate | longform-article-orchestrator |

### MOTOR 3 — GERAÇÃO SUPER PAGE (8 skills)
| Skill | Agente Principal |
|---|---|
| super-page-template-engine | superpage-orchestrator |
| local-proof-pack | superpage-orchestrator |
| conversion-copy-chief | superpage-orchestrator |
| section-stack-builder | superpage-orchestrator |
| schema-builder | schema-and-technical-seo-agent |
| internal-link-suggester | superpage-orchestrator |
| city-page-anti-duplication | superpage-orchestrator |
| service-page-validator | superpage-orchestrator |

### MOTOR 4 — REFRESH (5 skills)
| Skill | Agente Principal |
|---|---|
| performance-feedback-loop | content-refresh-agent |
| serp-drift-detector | content-refresh-agent |
| refresh-opportunity-detector | content-refresh-agent |
| refresh-rescheduler | content-refresh-agent |
| anti-hallucination-validator | quality-gate / content-refresh-agent |

### MOTOR 5 — OBSERVABILIDADE (4 skills)
| Skill | Agente Principal |
|---|---|
| run-step-logger | todos os agentes |
| artifact-register | todos os agentes geradores |
| output-version-manager | orchestrators |
| ai-gateway-abstraction | todos os agentes |

## Prioridade de instalação no Antigravity

### FASE 1 — P0 Imediato (instalar primeiro)
1. ai-gateway-abstraction
2. run-step-logger
3. artifact-register

### FASE 2 — Decisão + Backlog
4. intent-cluster-builder
5. strategic-value-scorer
6. mix-policy-engine
7. backlog-prioritizer

### FASE 3 — Pipeline de Artigos
8. research-step
9. outline-step
10. article-draft-composer
11. seo-enrichment-step
12. internal-link-suggester
13. anti-hallucination-validator
14. quality-gate
15. output-version-manager

### FASE 4 — Pipeline de Super Pages
16. super-page-template-engine
17. local-proof-pack
18. conversion-copy-chief
19. section-stack-builder
20. schema-builder
21. city-page-anti-duplication
22. service-page-validator

### FASE 5 — Radar
23. keyword-gap-analyzer
24. top-serp-diff
25. paa-and-forum-miner
26. competitor-change-monitor
27. geo-keyword-expander

### FASE 6 — Refresh Loop
28. performance-feedback-loop
29. serp-drift-detector
30. refresh-opportunity-detector
31. refresh-rescheduler
