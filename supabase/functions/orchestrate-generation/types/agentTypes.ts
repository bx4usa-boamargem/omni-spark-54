export interface AIRouterResult {
    success: boolean;
    content: string;
    model: string;
    provider: string;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    latencyMs: number;
    error?: string;
}

export interface AIRouterOptions {
    temperature?: number;
    maxTokens?: number;
    tracking?: {
        tenant_id?: string | null;
        blog_id?: string | null;
        user_id?: string | null;
        article_id?: string | null;
        job_id?: string | null;
    };
    archetype?: string;
    variation_seed?: string;
}

export type JobType = 'article' | 'super_page';

export interface JobInput {
    job_id?: string;
    job_type?: JobType;
    blog_id?: string;
    user_id?: string;
    tenant_id?: string;
    keyword: string;
    city?: string;
    niche?: string;
    language?: string;
    whatsapp?: string;
    business_name?: string;
    clone_url?: string;
    [key: string]: any;
}
