// ============================================================
// OmniSeen AI Engine — Pipeline Types
// ============================================================

import type { AgentContext, AgentStatus } from "./agents.ts";

export type PipelineKey =
  | "generate_article"
  | "generate_super_page"
  | "refresh_content"
  | "radar_run";

export interface PipelineStep {
  agent_id: string;
  depends_on: string[]; // agent_ids that must complete before this
  retry_max: number;
  timeout_ms: number;
  skip_if?: (context: PipelineRunContext) => boolean;
}

export interface PipelineDefinition {
  key: PipelineKey;
  name: string;
  description: string;
  steps: PipelineStep[];
}

export interface PipelineRun {
  id: string;
  tenant_id: string;
  pipeline_key: PipelineKey;
  status: AgentStatus;
  context_json: Record<string, unknown>;
  steps_completed: string[];
  steps_failed: string[];
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface PipelineRunContext extends AgentContext {
  pipeline_run_id: string;
  steps_outputs: Record<string, unknown>; // agent_id -> output
  current_step: string;
}

// Pipeline definitions (wiring)

export const PIPELINE_GENERATE_ARTICLE: PipelineDefinition = {
  key: "generate_article",
  name: "Generate Article",
  description: "Full pipeline: SERP → Blueprint → Write → SEO → QA → Publish",
  steps: [
    { agent_id: "serp_scout", depends_on: [], retry_max: 2, timeout_ms: 30000 },
    { agent_id: "entity_mapper", depends_on: ["serp_scout"], retry_max: 2, timeout_ms: 20000 },
    { agent_id: "trend_analyst", depends_on: ["serp_scout"], retry_max: 1, timeout_ms: 20000 },
    { agent_id: "competitor_gap", depends_on: ["serp_scout"], retry_max: 1, timeout_ms: 20000 },
    { agent_id: "blueprint_architect", depends_on: ["entity_mapper", "trend_analyst", "competitor_gap"], retry_max: 2, timeout_ms: 30000 },
    { agent_id: "section_writer", depends_on: ["blueprint_architect"], retry_max: 3, timeout_ms: 120000 },
    { agent_id: "interlink_agent", depends_on: ["section_writer"], retry_max: 2, timeout_ms: 20000 },
    { agent_id: "seo_pack_finalizer", depends_on: ["interlink_agent"], retry_max: 2, timeout_ms: 20000 },
    { agent_id: "quality_gate", depends_on: ["seo_pack_finalizer"], retry_max: 1, timeout_ms: 20000 },
  ],
};

export const PIPELINE_GENERATE_SUPER_PAGE: PipelineDefinition = {
  key: "generate_super_page",
  name: "Generate Super Page",
  description: "Template → Blueprint → Write → Schema → QA → Publish",
  steps: [
    { agent_id: "blueprint_architect", depends_on: [], retry_max: 2, timeout_ms: 30000 },
    { agent_id: "section_writer", depends_on: ["blueprint_architect"], retry_max: 3, timeout_ms: 120000 },
    { agent_id: "interlink_agent", depends_on: ["section_writer"], retry_max: 2, timeout_ms: 20000 },
    { agent_id: "seo_pack_finalizer", depends_on: ["interlink_agent"], retry_max: 2, timeout_ms: 20000 },
    { agent_id: "quality_gate", depends_on: ["seo_pack_finalizer"], retry_max: 1, timeout_ms: 20000 },
  ],
};

export const PIPELINE_RADAR_RUN: PipelineDefinition = {
  key: "radar_run",
  name: "Radar Intelligence Run",
  description: "Discover → Cluster → Score → Recommend",
  steps: [
    { agent_id: "serp_scout", depends_on: [], retry_max: 2, timeout_ms: 30000 },
    { agent_id: "entity_mapper", depends_on: ["serp_scout"], retry_max: 2, timeout_ms: 20000 },
    { agent_id: "trend_analyst", depends_on: ["serp_scout"], retry_max: 1, timeout_ms: 20000 },
    { agent_id: "competitor_gap", depends_on: ["serp_scout", "entity_mapper"], retry_max: 1, timeout_ms: 30000 },
    { agent_id: "radar_planner", depends_on: ["entity_mapper", "trend_analyst", "competitor_gap"], retry_max: 2, timeout_ms: 30000 },
  ],
};
