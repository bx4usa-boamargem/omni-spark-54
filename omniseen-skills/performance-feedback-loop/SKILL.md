# SKILL: performance-feedback-loop

## Finalidade
Coleta sinais de performance do conteúdo publicado (analytics internos, GSC proxy, comportamento de usuário) e os transforma em scores de performance por conteúdo. Alimenta o refresh-opportunity-detector com dados objetivos. Sem esta skill, o refresh é cego.

## Motor
MOTOR 4 — REFRESH

## Agentes que usam esta skill
- content-refresh-agent (ciclo semanal)

## Inputs
```json
{
  "tenant_id": "uuid",
  "content_items": [
    {
      "id": "uuid",
      "content_type": "blog | super_page",
      "url": "string",
      "slug": "string",
      "keyword": "string",
      "published_at": "timestamptz",
      "last_refreshed_at": "timestamptz | null"
    }
  ],
  "analytics_data": [
    {
      "content_id": "uuid",
      "period_days": "int — ex: 30",
      "page_views": "int",
      "avg_time_on_page": "int — segundos",
      "avg_scroll_depth": "float 0-1",
      "bounce_rate": "float 0-1",
      "cta_clicks": "int",
      "leads_generated": "int"
    }
  ],
  "gsc_data": [
    {
      "content_id": "uuid",
      "keyword": "string",
      "impressions": "int",
      "clicks": "int",
      "ctr": "float",
      "position_proxy": "float"
    }
  ],
  "evaluation_period_days": "int — default 30"
}
```

## Outputs
```json
{
  "performance_scores": [
    {
      "content_id": "uuid",
      "content_type": "blog | super_page",
      "keyword": "string",
      "performance_score": "int 0-100",
      "score_breakdown": {
        "engagement_score": "int 0-30 — time_on_page + scroll_depth",
        "traffic_score": "int 0-25 — views + impressions",
        "conversion_score": "int 0-25 — cta_clicks + leads",
        "serp_score": "int 0-20 — position_proxy + ctr"
      },
      "trend": "improving | stable | declining | critical",
      "days_since_published": "int",
      "days_since_refreshed": "int | null",
      "refresh_urgency": "none | low | medium | high | critical"
    }
  ],
  "portfolio_health": {
    "total_content": "int",
    "critical_count": "int",
    "high_count": "int",
    "healthy_count": "int",
    "avg_performance_score": "float"
  }
}
```

## Regras de execução
1. Se analytics_data vazio para um item: usar score_neutro=50 com trend="unknown" — não bloquear.
2. engagement_score: time_on_page > 180s = 15pts, scroll_depth > 0.6 = 15pts.
3. traffic_score: views > 100/mês = 15pts, impressions > 500 = 10pts.
4. conversion_score: leads > 0 = 15pts máximo proporcional, cta_clicks/views > 0.05 = 10pts.
5. serp_score: position_proxy <= 10 = 20pts, 11-20 = 12pts, 21-50 = 5pts, > 50 = 0pts.
6. trend=declining: performance_score caiu > 20% vs período anterior.
7. trend=critical: performance_score < 30 OU position_proxy > 50 OU leads=0 por > 60 dias.
8. refresh_urgency=critical: trend=critical E days_since_published > 90.
9. refresh_urgency=high: trend=declining OU days_since_refreshed > 180.
10. Salvar snapshot em `omnisim_performance_snapshots` antes de retornar.

## Validações obrigatórias
- [ ] performance_score entre 0 e 100
- [ ] trend preenchido para todos os itens
- [ ] portfolio_health calculado corretamente

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "performance-feedback-loop",
  "agent_key": "content-refresh-agent",
  "input_json": { "content_items_count": "int", "period_days": "int" },
  "output_json": { "critical_count": "int", "high_count": "int", "avg_score": "float" },
  "status": "done | failed"
}
```

## Persistência no Supabase
- INSERT em `omnisim_performance_snapshots` (uma row por conteúdo por período)
- Emitir job_event: `{ event_type: "step_completed", message: "performance-feedback: N itens avaliados, X critical, Y declining" }`
