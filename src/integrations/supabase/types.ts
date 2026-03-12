Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          blog_id: string | null
          cost_usd: number
          country: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          metadata: Json | null
          provider: string
          success: boolean | null
          tokens_used: number | null
        }
        Insert: {
          blog_id?: string | null
          cost_usd?: number
          country?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          success?: boolean | null
          tokens_used?: number | null
        }
        Update: {
          blog_id?: string | null
          cost_usd?: number
          country?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          success?: boolean | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      article_opportunities: {
        Row: {
          blog_id: string
          created_at: string | null
          funnel_stage: string | null
          goal: string | null
          id: string
          intel_week_id: string | null
          origin: string | null
          relevance_factors: Json | null
          relevance_score: number | null
          source_urls: string[] | null
          status: string | null
          suggested_keywords: string[] | null
          suggested_outline: Json | null
          suggested_title: string | null
          territory_id: string | null
          trend_source: string | null
          updated_at: string | null
          why_now: string | null
        }
        Insert: {
          blog_id: string
          created_at?: string | null
          funnel_stage?: string | null
          goal?: string | null
          id?: string
          intel_week_id?: string | null
          origin?: string | null
          relevance_factors?: Json | null
          relevance_score?: number | null
          source_urls?: string[] | null
          status?: string | null
          suggested_keywords?: string[] | null
          suggested_outline?: Json | null
          suggested_title?: string | null
          territory_id?: string | null
          trend_source?: string | null
          updated_at?: string | null
          why_now?: string | null
        }
        Update: {
          blog_id?: string
          created_at?: string | null
          funnel_stage?: string | null
          goal?: string | null
          id?: string
          intel_week_id?: string | null
          origin?: string | null
          relevance_factors?: Json | null
          relevance_score?: number | null
          source_urls?: string[] | null
          status?: string | null
          suggested_keywords?: string[] | null
          suggested_outline?: Json | null
          suggested_title?: string | null
          territory_id?: string | null
          trend_source?: string | null
          updated_at?: string | null
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_opportunities_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_opportunities_intel_week_id_fkey"
            columns: ["intel_week_id"]
            isOneToOne: false
            referencedRelation: "market_intel_weekly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_opportunities_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      article_smart_links: {
        Row: {
          article_id: string
          blog_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          article_id: string
          blog_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          article_id?: string
          blog_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_smart_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_smart_links_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          article_goal: string | null
          blog_id: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          faq: Json | null
          featured_image_url: string | null
          funnel_mode: string | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          pdf_view_count: number | null
          published_at: string | null
          quality_gate_status: string | null
          share_token: string | null
          slug: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          article_goal?: string | null
          blog_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          faq?: Json | null
          featured_image_url?: string | null
          funnel_mode?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_view_count?: number | null
          published_at?: string | null
          quality_gate_status?: string | null
          share_token?: string | null
          slug?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          article_goal?: string | null
          blog_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          faq?: Json | null
          featured_image_url?: string | null
          funnel_mode?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_view_count?: number | null
          published_at?: string | null
          quality_gate_status?: string | null
          share_token?: string | null
          slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_automation: {
        Row: {
          articles_per_period: number | null
          blog_id: string
          created_at: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          mode: string | null
          preferred_time: string | null
          updated_at: string | null
        }
        Insert: {
          articles_per_period?: number | null
          blog_id: string
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          mode?: string | null
          preferred_time?: string | null
          updated_at?: string | null
        }
        Update: {
          articles_per_period?: number | null
          blog_id?: string
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          mode?: string | null
          preferred_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_automation_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: true
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_members: {
        Row: {
          blog_id: string
          created_at: string | null
          id: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_members_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_visits: {
        Row: {
          blog_id: string
          id: string
          page_path: string | null
          visited_at: string
        }
        Insert: {
          blog_id: string
          id?: string
          page_path?: string | null
          visited_at?: string
        }
        Update: {
          blog_id?: string
          id?: string
          page_path?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_name: string | null
          banner_description: string | null
          banner_enabled: boolean | null
          banner_image_url: string | null
          banner_link_url: string | null
          banner_mobile_image_url: string | null
          banner_title: string | null
          brand_description: string | null
          color_palette: Json | null
          created_at: string | null
          cta_text: string | null
          cta_type: string | null
          cta_url: string | null
          custom_domain: string | null
          description: string | null
          domain_verification_token: string | null
          domain_verified: boolean | null
          favicon_url: string | null
          footer_text: string | null
          id: string
          is_active: boolean | null
          logo_negative_url: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          platform_subdomain: string | null
          primary_color: string | null
          public_blog_enabled: boolean | null
          script_body: string | null
          script_footer: string | null
          script_head: string | null
          secondary_color: string | null
          show_powered_by: boolean | null
          slug: string
          tenant_id: string | null
          tracking_config: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          banner_description?: string | null
          banner_enabled?: boolean | null
          banner_image_url?: string | null
          banner_link_url?: string | null
          banner_mobile_image_url?: string | null
          banner_title?: string | null
          brand_description?: string | null
          color_palette?: Json | null
          created_at?: string | null
          cta_text?: string | null
          cta_type?: string | null
          cta_url?: string | null
          custom_domain?: string | null
          description?: string | null
          domain_verification_token?: string | null
          domain_verified?: boolean | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          logo_negative_url?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          platform_subdomain?: string | null
          primary_color?: string | null
          public_blog_enabled?: boolean | null
          script_body?: string | null
          script_footer?: string | null
          script_head?: string | null
          secondary_color?: string | null
          show_powered_by?: boolean | null
          slug: string
          tenant_id?: string | null
          tracking_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          banner_description?: string | null
          banner_enabled?: boolean | null
          banner_image_url?: string | null
          banner_link_url?: string | null
          banner_mobile_image_url?: string | null
          banner_title?: string | null
          brand_description?: string | null
          color_palette?: Json | null
          created_at?: string | null
          cta_text?: string | null
          cta_type?: string | null
          cta_url?: string | null
          custom_domain?: string | null
          description?: string | null
          domain_verification_token?: string | null
          domain_verified?: boolean | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          logo_negative_url?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          platform_subdomain?: string | null
          primary_color?: string | null
          public_blog_enabled?: boolean | null
          script_body?: string | null
          script_footer?: string | null
          script_head?: string | null
          secondary_color?: string | null
          show_powered_by?: boolean | null
          slug?: string
          tenant_id?: string | null
          tracking_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_agent_config: {
        Row: {
          agent_name: string | null
          agent_subscription_status: string | null
          blog_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_tokens_per_day: number | null
          proactive_delay_seconds: number | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_subscription_status?: string | null
          blog_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens_per_day?: number | null
          proactive_delay_seconds?: number | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_subscription_status?: string | null
          blog_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens_per_day?: number | null
          proactive_delay_seconds?: number | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_agent_config_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: true
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profile: {
        Row: {
          blog_id: string
          brand_keywords: Json | null
          business_name: string | null
          business_segment: string | null
          city: string | null
          city_state: string | null
          country: string | null
          created_at: string
          desires: Json | null
          full_address: string | null
          id: string
          pain_points: Json | null
          services: Json | null
          state: string | null
          target_audience: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          blog_id: string
          brand_keywords?: Json | null
          business_name?: string | null
          business_segment?: string | null
          city?: string | null
          city_state?: string | null
          country?: string | null
          created_at?: string
          desires?: Json | null
          full_address?: string | null
          id?: string
          pain_points?: Json | null
          services?: Json | null
          state?: string | null
          target_audience?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          blog_id?: string
          brand_keywords?: Json | null
          business_name?: string | null
          business_segment?: string | null
          city?: string | null
          city_state?: string | null
          country?: string | null
          created_at?: string
          desires?: Json | null
          full_address?: string | null
          id?: string
          pain_points?: Json | null
          services?: Json | null
          state?: string | null
          target_audience?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_strategy: {
        Row: {
          acao_desejada: string | null
          blog_id: string | null
          canal_cta: string | null
          created_at: string | null
          desejo_principal: string | null
          diferenciais: string[] | null
          dor_principal: string | null
          empresa_nome: string | null
          id: string
          nivel_conhecimento: string | null
          nivel_consciencia: string | null
          o_que_oferece: string | null
          principais_beneficios: string[] | null
          regiao_atuacao: string | null
          tipo_negocio: string | null
          tipo_publico: string | null
          updated_at: string | null
        }
        Insert: {
          acao_desejada?: string | null
          blog_id?: string | null
          canal_cta?: string | null
          created_at?: string | null
          desejo_principal?: string | null
          diferenciais?: string[] | null
          dor_principal?: string | null
          empresa_nome?: string | null
          id?: string
          nivel_conhecimento?: string | null
          nivel_consciencia?: string | null
          o_que_oferece?: string | null
          principais_beneficios?: string[] | null
          regiao_atuacao?: string | null
          tipo_negocio?: string | null
          tipo_publico?: string | null
          updated_at?: string | null
        }
        Update: {
          acao_desejada?: string | null
          blog_id?: string | null
          canal_cta?: string | null
          created_at?: string | null
          desejo_principal?: string | null
          diferenciais?: string[] | null
          dor_principal?: string | null
          empresa_nome?: string | null
          id?: string
          nivel_conhecimento?: string | null
          nivel_consciencia?: string | null
          o_que_oferece?: string | null
          principais_beneficios?: string[] | null
          regiao_atuacao?: string | null
          tipo_negocio?: string | null
          tipo_publico?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_strategy_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: true
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_credential_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string | null
          id: string
          integration_id: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by?: string | null
          id?: string
          integration_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string | null
          id?: string
          integration_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_credential_access_log_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "cms_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_credential_access_log_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "cms_integrations_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_integrations: {
        Row: {
          access_token_encrypted: string | null
          api_key: string | null
          api_key_encrypted: string | null
          api_secret: string | null
          api_secret_encrypted: string | null
          auth_type: string | null
          auto_publish: boolean | null
          blog_id: string
          created_at: string | null
          extra_config: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          location_id: string | null
          platform: string
          refresh_token_encrypted: string | null
          site_url: string
          token_expires_at: string | null
          updated_at: string | null
          username: string | null
          wordpress_site_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          api_key?: string | null
          api_key_encrypted?: string | null
          api_secret?: string | null
          api_secret_encrypted?: string | null
          auth_type?: string | null
          auto_publish?: boolean | null
          blog_id: string
          created_at?: string | null
          extra_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          location_id?: string | null
          platform: string
          refresh_token_encrypted?: string | null
          site_url: string
          token_expires_at?: string | null
          updated_at?: string | null
          username?: string | null
          wordpress_site_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          api_key?: string | null
          api_key_encrypted?: string | null
          api_secret?: string | null
          api_secret_encrypted?: string | null
          auth_type?: string | null
          auto_publish?: boolean | null
          blog_id?: string
          created_at?: string | null
          extra_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          location_id?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          site_url?: string
          token_expires_at?: string | null
          updated_at?: string | null
          username?: string | null
          wordpress_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_integrations_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_publish_logs: {
        Row: {
          action: string
          article_id: string | null
          cms_post_id: string | null
          cms_post_url: string | null
          created_at: string | null
          error_message: string | null
          id: string
          integration_id: string | null
          response_data: Json | null
          status: string
        }
        Insert: {
          action: string
          article_id?: string | null
          cms_post_id?: string | null
          cms_post_url?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          response_data?: Json | null
          status?: string
        }
        Update: {
          action?: string
          article_id?: string | null
          cms_post_id?: string | null
          cms_post_url?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          response_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_publish_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "cms_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_publish_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "cms_integrations_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          blog_id: string
          created_at: string | null
          id: string
          name: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          blog_id: string
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          blog_id?: string
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_logs: {
        Row: {
          action_type: string
          blog_id: string | null
          created_at: string | null
          estimated_cost_usd: number | null
          id: string
          metadata: Json | null
          model_used: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          blog_id?: string | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          blog_id?: string | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumption_logs_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      cta_clicks: {
        Row: {
          blog_id: string
          clicked_at: string
          cta_label: string | null
          id: string
        }
        Insert: {
          blog_id: string
          clicked_at?: string
          cta_label?: string | null
          id?: string
        }
        Update: {
          blog_id?: string
          clicked_at?: string
          cta_label?: string | null
          id?: string
        }
        Relationships: []
      }
      ebook_views: {
        Row: {
          article_id: string | null
          blog_id: string | null
          created_at: string | null
          id: string
          last_viewed_at: string | null
          share_token: string
          unique_ips: Json | null
          view_count: number | null
        }
        Insert: {
          article_id?: string | null
          blog_id?: string | null
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          share_token?: string
          unique_ips?: Json | null
          view_count?: number | null
        }
        Update: {
          article_id?: string | null
          blog_id?: string | null
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          share_token?: string
          unique_ips?: Json | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ebook_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebook_views_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          brevo_message_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          status: string | null
          template_type: string | null
          to_email: string
        }
        Insert: {
          brevo_message_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          template_type?: string | null
          to_email: string
        }
        Update: {
          brevo_message_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          template_type?: string | null
          to_email?: string
        }
        Relationships: []
      }
      job_dependencies: {
        Row: {
          depends_on_job_id: string
          graph_id: string
          id: string
          job_id: string
        }
        Insert: {
          depends_on_job_id: string
          graph_id: string
          id?: string
          job_id: string
        }
        Update: {
          depends_on_job_id?: string
          graph_id?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_dependencies_depends_on_job_id_fkey"
            columns: ["depends_on_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_dependencies_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "job_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_dependencies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          created_at: string
          data_json: Json | null
          event_type: string
          id: string
          job_id: string
          message: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          data_json?: Json | null
          event_type: string
          id?: string
          job_id: string
          message?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          data_json?: Json | null
          event_type?: string
          id?: string
          job_id?: string
          message?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_graphs: {
        Row: {
          completed_at: string | null
          created_at: string
          graph_type: string
          id: string
          payload: Json | null
          root_job_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          graph_type: string
          id?: string
          payload?: Json | null
          root_job_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          graph_type?: string
          id?: string
          payload?: Json | null
          root_job_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_graphs_root_job"
            columns: ["root_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_text: string | null
          graph_id: string | null
          id: string
          job_type: string
          max_retries: number
          parent_job_id: string | null
          payload: Json | null
          result: Json | null
          run_after: string
          runner_id: string | null
          started_at: string | null
          status: string
          tenant_id: string
          try_count: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_text?: string | null
          graph_id?: string | null
          id?: string
          job_type: string
          max_retries?: number
          parent_job_id?: string | null
          payload?: Json | null
          result?: Json | null
          run_after?: string
          runner_id?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          try_count?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_text?: string | null
          graph_id?: string | null
          id?: string
          job_type?: string
          max_retries?: number
          parent_job_id?: string | null
          payload?: Json | null
          result?: Json | null
          run_after?: string
          runner_id?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          try_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "job_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          blog_id: string
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          blog_id: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          blog_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      market_intel_weekly: {
        Row: {
          blog_id: string
          competitor_gaps: Json | null
          content_ideas: Json | null
          country: string
          created_at: string | null
          id: string
          keywords: Json | null
          market_snapshot: string | null
          query_cost_usd: number | null
          questions: Json | null
          raw_response: Json | null
          source: string | null
          sources_count: number | null
          territory_id: string | null
          trends: Json | null
          week_of: string
        }
        Insert: {
          blog_id: string
          competitor_gaps?: Json | null
          content_ideas?: Json | null
          country?: string
          created_at?: string | null
          id?: string
          keywords?: Json | null
          market_snapshot?: string | null
          query_cost_usd?: number | null
          questions?: Json | null
          raw_response?: Json | null
          source?: string | null
          sources_count?: number | null
          territory_id?: string | null
          trends?: Json | null
          week_of: string
        }
        Update: {
          blog_id?: string
          competitor_gaps?: Json | null
          content_ideas?: Json | null
          country?: string
          created_at?: string | null
          id?: string
          keywords?: Json | null
          market_snapshot?: string | null
          query_cost_usd?: number | null
          questions?: Json | null
          raw_response?: Json | null
          source?: string | null
          sources_count?: number | null
          territory_id?: string | null
          trends?: Json | null
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_intel_weekly_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_intel_weekly_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      market_radar_cache: {
        Row: {
          avg_rating: number | null
          avg_reviews: number | null
          city: string
          competitors: Json | null
          content_gaps: Json | null
          country: string
          created_at: string
          demand_signals: Json | null
          entities: Json | null
          expires_at: string
          geo_bounds: Json | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          knowledge_entities: Json | null
          local_businesses: Json | null
          maps_intelligence_at: string | null
          maps_intelligence_status: string | null
          neighborhoods: Json | null
          nl_entities: Json | null
          opportunity_scores: Json | null
          popular_queries: Json | null
          questions: Json | null
          radar_status: string
          raw_opportunities: Json | null
          run_id: string | null
          segment: string
          serp_results: Json | null
          service: string | null
          services: Json | null
          top_rated: Json | null
          updated_at: string
        }
        Insert: {
          avg_rating?: number | null
          avg_reviews?: number | null
          city: string
          competitors?: Json | null
          content_gaps?: Json | null
          country?: string
          created_at?: string
          demand_signals?: Json | null
          entities?: Json | null
          expires_at?: string
          geo_bounds?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          knowledge_entities?: Json | null
          local_businesses?: Json | null
          maps_intelligence_at?: string | null
          maps_intelligence_status?: string | null
          neighborhoods?: Json | null
          nl_entities?: Json | null
          opportunity_scores?: Json | null
          popular_queries?: Json | null
          questions?: Json | null
          radar_status?: string
          raw_opportunities?: Json | null
          run_id?: string | null
          segment: string
          serp_results?: Json | null
          service?: string | null
          services?: Json | null
          top_rated?: Json | null
          updated_at?: string
        }
        Update: {
          avg_rating?: number | null
          avg_reviews?: number | null
          city?: string
          competitors?: Json | null
          content_gaps?: Json | null
          country?: string
          created_at?: string
          demand_signals?: Json | null
          entities?: Json | null
          expires_at?: string
          geo_bounds?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          knowledge_entities?: Json | null
          local_businesses?: Json | null
          maps_intelligence_at?: string | null
          maps_intelligence_status?: string | null
          neighborhoods?: Json | null
          nl_entities?: Json | null
          opportunity_scores?: Json | null
          popular_queries?: Json | null
          questions?: Json | null
          radar_status?: string
          raw_opportunities?: Json | null
          run_id?: string | null
          segment?: string
          serp_results?: Json | null
          service?: string | null
          services?: Json | null
          top_rated?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_config: {
        Row: {
          blog_id: string
          created_at: string | null
          dag_version: string | null
          id: string
          max_parallel_sections: number | null
          rollback_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
          use_dag_pipeline: boolean
        }
        Insert: {
          blog_id: string
          created_at?: string | null
          dag_version?: string | null
          id?: string
          max_parallel_sections?: number | null
          rollback_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
          use_dag_pipeline?: boolean
        }
        Update: {
          blog_id?: string
          created_at?: string | null
          dag_version?: string | null
          id?: string
          max_parallel_sections?: number | null
          rollback_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          use_dag_pipeline?: boolean
        }
        Relationships: []
      }
      prompt_type_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          prompt_content: Json
          version: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          prompt_content: Json
          version?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          prompt_content?: Json
          version?: string
        }
        Relationships: []
      }
      radar_market_cache: {
        Row: {
          businesses_found: number | null
          city: string
          cluster_market: boolean | null
          country: string
          created_at: string
          entities: Json | null
          expires_at: string
          id: string
          local_businesses: Json | null
          paa_questions: Json | null
          raw_opportunities: Json | null
          related_searches: Json | null
          run_id: string | null
          segment: string
          semantic_gaps: Json | null
          serp_results: Json | null
          serp_snippets: Json | null
          serp_titles: Json | null
          services: Json | null
          updated_at: string
        }
        Insert: {
          businesses_found?: number | null
          city: string
          cluster_market?: boolean | null
          country?: string
          created_at?: string
          entities?: Json | null
          expires_at?: string
          id?: string
          local_businesses?: Json | null
          paa_questions?: Json | null
          raw_opportunities?: Json | null
          related_searches?: Json | null
          run_id?: string | null
          segment: string
          semantic_gaps?: Json | null
          serp_results?: Json | null
          serp_snippets?: Json | null
          serp_titles?: Json | null
          services?: Json | null
          updated_at?: string
        }
        Update: {
          businesses_found?: number | null
          city?: string
          cluster_market?: boolean | null
          country?: string
          created_at?: string
          entities?: Json | null
          expires_at?: string
          id?: string
          local_businesses?: Json | null
          paa_questions?: Json | null
          raw_opportunities?: Json | null
          related_searches?: Json | null
          run_id?: string | null
          segment?: string
          semantic_gaps?: Json | null
          serp_results?: Json | null
          serp_snippets?: Json | null
          serp_titles?: Json | null
          services?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      radar_v3_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_v3_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "radar_v3_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_v3_opportunities: {
        Row: {
          blog_id: string
          confidence_score: number
          created_at: string
          id: string
          keyword: string
          metadata: Json | null
          run_id: string
          source: string
          status: string
          tenant_id: string
          title: string
          why_now: string | null
        }
        Insert: {
          blog_id: string
          confidence_score?: number
          created_at?: string
          id?: string
          keyword: string
          metadata?: Json | null
          run_id: string
          source?: string
          status?: string
          tenant_id: string
          title: string
          why_now?: string | null
        }
        Update: {
          blog_id?: string
          confidence_score?: number
          created_at?: string
          id?: string
          keyword?: string
          metadata?: Json | null
          run_id?: string
          source?: string
          status?: string
          tenant_id?: string
          title?: string
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radar_v3_opportunities_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_v3_opportunities_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "radar_v3_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_v3_runs: {
        Row: {
          blog_id: string
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          opportunities_count: number | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          opportunities_count?: number | null
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          opportunities_count?: number | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_v3_runs_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_likes: {
        Row: {
          id: string
          liked_at: string
          session_id: string
          smart_link_id: string
        }
        Insert: {
          id?: string
          liked_at?: string
          session_id: string
          smart_link_id: string
        }
        Update: {
          id?: string
          liked_at?: string
          session_id?: string
          smart_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_likes_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "article_smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_visits: {
        Row: {
          id: string
          ip_address: unknown
          referrer: string | null
          smart_link_id: string
          user_agent: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          referrer?: string | null
          smart_link_id: string
          user_agent?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          referrer?: string | null
          smart_link_id?: string
          user_agent?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_visits_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "article_smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_links: {
        Row: {
          article_id: string | null
          blog_id: string | null
          created_at: string | null
          description: string | null
          id: string
          share_token: string
          slug: string | null
          title: string | null
        }
        Insert: {
          article_id?: string | null
          blog_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          share_token?: string
          slug?: string | null
          title?: string | null
        }
        Update: {
          article_id?: string | null
          blog_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          share_token?: string
          slug?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_links_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_credentials: {
        Row: {
          blog_id: string
          created_at: string
          facebook_access_token: string | null
          facebook_page_id: string | null
          facebook_page_name: string | null
          google_access_token: string | null
          google_account_name: string | null
          google_business_account_id: string | null
          google_business_location_id: string | null
          google_expires_at: string | null
          google_refresh_token: string | null
          id: string
          instagram_access_token: string | null
          instagram_account_name: string | null
          instagram_business_account_id: string | null
          instagram_expires_at: string | null
          linkedin_access_token: string | null
          linkedin_account_id: string | null
          linkedin_account_name: string | null
          linkedin_expires_at: string | null
          linkedin_org_name: string | null
          linkedin_organization_id: string | null
          linkedin_refresh_token: string | null
          updated_at: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          facebook_access_token?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          google_access_token?: string | null
          google_account_name?: string | null
          google_business_account_id?: string | null
          google_business_location_id?: string | null
          google_expires_at?: string | null
          google_refresh_token?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_account_name?: string | null
          instagram_business_account_id?: string | null
          instagram_expires_at?: string | null
          linkedin_access_token?: string | null
          linkedin_account_id?: string | null
          linkedin_account_name?: string | null
          linkedin_expires_at?: string | null
          linkedin_org_name?: string | null
          linkedin_organization_id?: string | null
          linkedin_refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          facebook_access_token?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          google_access_token?: string | null
          google_account_name?: string | null
          google_business_account_id?: string | null
          google_business_location_id?: string | null
          google_expires_at?: string | null
          google_refresh_token?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_account_name?: string | null
          instagram_business_account_id?: string | null
          instagram_expires_at?: string | null
          linkedin_access_token?: string | null
          linkedin_account_id?: string | null
          linkedin_account_name?: string | null
          linkedin_expires_at?: string | null
          linkedin_org_name?: string | null
          linkedin_organization_id?: string | null
          linkedin_refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_credentials_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: true
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          article_id: string | null
          blog_id: string
          content: string
          created_at: string
          error_message: string | null
          external_post_id: string | null
          id: string
          media_url: string | null
          platform: string
          published_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          blog_id: string
          content: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          media_url?: string | null
          platform: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          blog_id?: string
          content?: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          media_url?: string | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_activity_log: {
        Row: {
          action: string
          blog_id: string
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          blog_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          blog_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_log_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          blog_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
        }
        Insert: {
          blog_id: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role?: string
          token: string
        }
        Update: {
          blog_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          blog_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          blog_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          blog_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          blog_id: string | null
          created_at: string | null
          domain: string
          domain_type: string
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          blog_id?: string | null
          created_at?: string | null
          domain: string
          domain_type?: string
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          blog_id?: string | null
          created_at?: string | null
          domain?: string
          domain_type?: string
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string | null
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_radar_opportunities: {
        Row: {
          blog_id: string
          cache_id: string | null
          created_at: string
          custom_angle: string | null
          funnel_stage: string | null
          id: string
          keyword: string
          local_context: Json | null
          opportunity_score: number
          radar_run_id: string | null
          relevance_score: number | null
          service: string | null
          shared_from: string | null
          source: string | null
          status: string
          tenant_id: string
          title_suggestion: string
          updated_at: string | null
          why_now: string | null
        }
        Insert: {
          blog_id: string
          cache_id?: string | null
          created_at?: string
          custom_angle?: string | null
          funnel_stage?: string | null
          id?: string
          keyword: string
          local_context?: Json | null
          opportunity_score?: number
          radar_run_id?: string | null
          relevance_score?: number | null
          service?: string | null
          shared_from?: string | null
          source?: string | null
          status?: string
          tenant_id: string
          title_suggestion: string
          updated_at?: string | null
          why_now?: string | null
        }
        Update: {
          blog_id?: string
          cache_id?: string | null
          created_at?: string
          custom_angle?: string | null
          funnel_stage?: string | null
          id?: string
          keyword?: string
          local_context?: Json | null
          opportunity_score?: number
          radar_run_id?: string | null
          relevance_score?: number | null
          service?: string | null
          shared_from?: string | null
          source?: string | null
          status?: string
          tenant_id?: string
          title_suggestion?: string
          updated_at?: string | null
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_radar_opportunities_cache_id_fkey"
            columns: ["cache_id"]
            isOneToOne: false
            referencedRelation: "market_radar_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_radar_opportunities_shared_from_fkey"
            columns: ["shared_from"]
            isOneToOne: false
            referencedRelation: "market_radar_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_radar_status: {
        Row: {
          blog_id: string
          cache_id: string | null
          created_at: string
          error_message: string | null
          id: string
          last_run_at: string | null
          opportunities_count: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blog_id: string
          cache_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_run_at?: string | null
          opportunities_count?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          blog_id?: string
          cache_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_run_at?: string | null
          opportunities_count?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_radar_status_cache_id_fkey"
            columns: ["cache_id"]
            isOneToOne: false
            referencedRelation: "market_radar_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string
          plan: string
          slug: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id: string
          plan?: string
          slug: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          plan?: string
          slug?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      territories: {
        Row: {
          blog_id: string
          city: string | null
          country: string
          created_at: string | null
          id: string
          is_active: boolean | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          blog_id: string
          city?: string | null
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          blog_id?: string
          city?: string | null
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cms_integrations_decrypted: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          auth_type: string | null
          auto_publish: boolean | null
          blog_id: string | null
          created_at: string | null
          extra_config: Json | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          location_id: string | null
          platform: string | null
          refresh_token: string | null
          site_url: string | null
          token_expires_at: string | null
          updated_at: string | null
          username: string | null
          wordpress_site_id: string | null
        }
        Insert: {
          access_token?: never
          api_key?: never
          api_secret?: never
          auth_type?: string | null
          auto_publish?: boolean | null
          blog_id?: string | null
          created_at?: string | null
          extra_config?: Json | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          location_id?: string | null
          platform?: string | null
          refresh_token?: never
          site_url?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          username?: string | null
          wordpress_site_id?: string | null
        }
        Update: {
          access_token?: never
          api_key?: never
          api_secret?: never
          auth_type?: string | null
          auto_publish?: boolean | null
          blog_id?: string | null
          created_at?: string | null
          extra_config?: Json | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          location_id?: string | null
          platform?: string | null
          refresh_token?: never
          site_url?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          username?: string | null
          wordpress_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_integrations_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_step_metrics: {
        Row: {
          avg_duration_ms: number | null
          avg_retries: number | null
          dead_letters: number | null
          failures: number | null
          job_type: string | null
          last_execution: string | null
          p50_duration_ms: number | null
          p95_duration_ms: number | null
          success_rate: number | null
          successes: number | null
          total_executions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      build_article_graph: {
        Args: { p_payload: Json; p_section_count?: number; p_tenant_id: string }
        Returns: string
      }
      claim_next_job: {
        Args: { p_runner_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          error_text: string | null
          graph_id: string | null
          id: string
          job_type: string
          max_retries: number
          parent_job_id: string | null
          payload: Json | null
          result: Json | null
          run_after: string
          runner_id: string | null
          started_at: string | null
          status: string
          tenant_id: string
          try_count: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_job: {
        Args: { p_job_id: string; p_result?: Json }
        Returns: undefined
      }
      decrypt_credential: {
        Args: { ciphertext: string; key_id: string }
        Returns: string
      }
      encrypt_credential: {
        Args: { key_id: string; plaintext: string }
        Returns: string
      }
      fail_job: {
        Args: { p_error?: string; p_job_id: string }
        Returns: undefined
      }
      get_client_roi_dashboard: {
        Args: { p_blog_id: string }
        Returns: {
          published_articles: number
          total_articles: number
          total_cta_clicks: number
          total_leads: number
          total_views: number
        }[]
      }
      get_link_stats: {
        Args: { p_smart_link_id: string }
        Returns: {
          total_likes: number
          total_visits: number
        }[]
      }
      get_owned_tenant_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_tenant_ids_for_user: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_admin_blog_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_blog_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_user_tenant_ids: { Args: { p_user_id: string }; Returns: string[] }
      graph_status: { Args: { p_graph_id: string }; Returns: Json }
      graph_timeline: {
        Args: { p_graph_id: string; p_limit?: number }
        Returns: Json
      }
      should_use_dag: {
        Args: { p_blog_id: string; p_tenant_id: string }
        Returns: boolean
      }
      tenant_pipeline_summary: { Args: { p_tenant_id: string }; Returns: Json }
      toggle_dag_pipeline: {
        Args: { p_blog_id: string; p_enable: boolean; p_tenant_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
