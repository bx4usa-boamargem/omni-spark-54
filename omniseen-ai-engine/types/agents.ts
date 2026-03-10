// ============================================================
// OmniSeen AI Engine — Agent & Skill Types
// Compatible: Deno / Supabase Edge Runtime
// ============================================================

export type AgentCategory =
  | "radar"
  | "strategy"
  | "production"
  | "seo"
  | "conversion"
  | "distribution"
  | "interaction"
  | "analytics";

export type AgentModel = "flash" | "pro";

export type AgentStatus = "idle" | "running" | "done" | "failed" | "skipped";

export interface AgentConfig {
  agent_id: string;
  name: string;
  category: AgentCategory;
  description: string;
  model: AgentModel;
  skills: string[];
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  connections: string[]; // agent_ids this connects to
  retry_max: number;
  timeout_ms: number;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  tenant_id: string;
  job_id?: string;
  pipeline_run_id?: string;
  status: AgentStatus;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface SkillConfig<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  execute: (input: TInput, context?: AgentContext) => Promise<TOutput>;
}

export interface AgentContext {
  tenant_id: string;
  job_id?: string;
  pipeline_run_id?: string;
  pipeline_context: Record<string, unknown>; // shared data across pipeline steps
  web_research_enabled: boolean;
  locale: string; // pt-BR
  market: string; // BR
}

// ---- Shared domain types ----

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
  domain: string;
  is_local_pack: boolean;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  address: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface EntityResult {
  name: string;
  type: string;
  score: number;
  mid?: string; // Knowledge Graph ID
}

export interface OutlineSection {
  h2: string;
  h3s: string[];
  intent: string;
  word_count_target: number;
  local_signal_required: boolean;
  schema_eligible: boolean;
}

export interface ContentBlueprint {
  h1: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  sections: OutlineSection[];
  local_signals: string[];
  entities_required: string[];
  schema_types: string[];
  word_count_total: number;
  primary_keyword: string;
  secondary_keywords: string[];
}

export interface GeneratedSection {
  h2: string;
  html: string;
  word_count: number;
  local_signal_count: number;
  claims_flagged: string[];
}

export interface JSONLDSchema {
  "@context": string;
  "@type": string | string[];
  [key: string]: unknown;
}

export interface BusinessInputs {
  empresa: string;
  servico: string;
  cidade: string;
  estado: string;
  telefone: string;
  endereco?: string;
  site_url?: string;
  horario_funcionamento?: string;
  area_atendimento?: string[];
}

export interface LinkSuggestion {
  anchor: string;
  url: string;
  reason: string;
  position_hint: string; // which section to inject
}

export interface PageIndex {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "blog" | "super_page";
  keywords: string[];
  excerpt: string;
}

export interface QualityReport {
  score: number; // 0-100
  approved: boolean;
  warnings: string[];
  auto_fixes: string[];
  publish_ready: boolean;
  retry_with_context?: string[]; // injected back into SectionWriter on retry
}

export interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  interest_summary?: string;
  page_url: string;
  source: "agent";
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

export interface PageContext {
  page_url: string;
  page_type: "blog" | "super_page" | "home";
  title: string;
  excerpt: string;
  servico?: string;
  cidade?: string;
  telefone?: string;
}
