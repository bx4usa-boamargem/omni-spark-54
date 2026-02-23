# OmniSeen — Production Deploy

## 1. Vercel (Frontend)

- **Build:** `npm run build`
- **Output:** `dist`
- **Env vars (Vercel Project → Settings → Environment Variables):**
  - `VITE_SUPABASE_URL` — Supabase project URL (e.g. `https://oxbrvyinmpbkllicaxqk.supabase.co`)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
  - `VITE_OMNISEEN_WHATSAPP` (optional) — Contact WhatsApp

**Deploy via GitHub:** Connect repo at [vercel.com/new](https://vercel.com/new), select this repo, add env vars above, deploy. Every push to `main` will auto-deploy.

---

## 2. Supabase (DB + Edge Functions)

Migrations and Edge Functions are deployed by **GitHub Actions** on push to `main`.

### Secrets (GitHub repo → Settings → Secrets and variables → Actions)

| Secret | Where to get it |
|--------|------------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Generate token |
| `SUPABASE_PROJECT_REF` | Supabase project URL: `https://XXXX.supabase.co` → use `XXXX` (e.g. `oxbrvyinmpbkllicaxqk`) |

**Where to paste:** GitHub → Your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`.

### Migrations applied by workflow

- All files in `supabase/migrations/` (including `20260223120000_phase0_content_type_and_schema.sql` and existing `quality_gate_status` columns).

### Edge Functions deployed by workflow

- `orchestrate-generation` — True Super Page Engine V2 pipeline
- `ai-router` — LLM routing for SERP, outline, content, entities
- `calculate-content-score` — SEO score (Quality Gate)
- `create-generation-job` — Job creation
- `generate-image` — Standalone image generation (if used by UI)

### Supabase Dashboard — Edge Function secrets

In **Supabase Dashboard** → **Project Settings** → **Edge Functions** (or **Settings** → **API**), ensure:

- `LOVABLE_API_KEY` is set (for Gemini image generation in `orchestrate-generation`).

---

## 3. Smoke test (post-deploy)

1. **Login** — Open production URL, sign in.
2. **Generate ARTICLE (1500–3000 words)** — Create article, confirm hero + section images.
3. **Generate SUPER_PAGE (3000–6000 words)** — Create super page, confirm hero + up to 8 section images.
4. **Quality Gate** — After generation, confirm article shows approved/blocked and publish becomes available when approved.
5. **Sidebar** — Collapsed sidebar ~80px, no overlay blocking content; editor fully visible.
