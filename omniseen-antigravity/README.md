# OmniSeen AI — Configuração do Antigravity

Este diretório contém a configuração do **Google Antigravity IDE** para o projeto OmniSeen.

## Como usar

### 1. Abrir o projeto no Antigravity
1. Abrir Antigravity
2. File → Open Folder → selecionar a raiz do repositório OmniSeen
3. O Antigravity carrega automaticamente os arquivos em `.antigravity/`

### 2. O que foi configurado

```
.antigravity/
├── rules.md                    ← Regras que o agente SEMPRE segue
├── workflows/
│   ├── new-edge-fn.md          ← /new-edge-fn
│   ├── new-agent.md            ← /new-agent
│   ├── new-skill.md            ← /new-skill
│   ├── new-migration.md        ← /new-migration
│   └── debug-edge-fn.md        ← /debug-edge-fn
└── knowledge/
    ├── architecture.md         ← Contexto completo
    ├── patterns.md             ← Padrões e anti-padrões
    └── backlog.md              ← O que falta implementar
```

### 3. Slash commands no Agent Manager

| Comando | O que faz |
|---------|-----------|
| `/new-edge-fn` | Cria nova Supabase Edge Function |
| `/new-agent` | Cria novo agent |
| `/new-skill` | Cria nova skill pura |
| `/new-migration` | Cria migration SQL com RLS |
| `/debug-edge-fn` | Diagnostica Edge Function com erro |

### 4. Exemplos de missões para o Antigravity

```
Implemente o AG-06 RadarPlanner conforme .antigravity/knowledge/backlog.md
```

```
/new-migration — tabela job_events conforme backlog.md
```

```
/new-edge-fn — scheduler-tick conforme backlog.md
```

### 5. Testar localmente

```bash
supabase start
supabase functions serve --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/generate-article \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "test-uuid", "manual_topic": "dedetização em SP"}'
```
