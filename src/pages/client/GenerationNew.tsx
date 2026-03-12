/**
 * GenerationNew — OMNISEEN V4
 * Tela premium de criação de novo artigo via IA
 * Design: dark premium, paleta marca (roxo + laranja)
 */
import '@/styles/generation.css';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  MapPin,
  Tag,
  Settings2,
  Target,
  FileText,
  Mic,
  Building2,
  Phone,
  Globe,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ── Tipos ── */
interface FormState {
  keyword: string;
  city: string;
  state: string;
  niche: string;
  intent: string;
  target_words: string;
  tone: string;
  person: string;
  business_name: string;
  phone: string;
  whatsapp: string;
  website: string;
  avoid: string;
}

/* ── Opções de tone ── */
const TONES = [
  { value: "profissional", label: "Profissional" },
  { value: "informal", label: "Informal" },
  { value: "técnico", label: "Técnico" },
  { value: "amigável", label: "Amigável" },
];

const INTENTS = [
  { value: "auto", label: "Automático", hint: "IA decide" },
  { value: "informational", label: "Informacional", hint: "Educar" },
  { value: "service", label: "Serviço", hint: "Captar" },
  { value: "transactional", label: "Conversão", hint: "Vender" },
];

const WORDS = [
  { value: "1500", label: "1.500" },
  { value: "2000", label: "2.000" },
  { value: "2500", label: "2.500 ✦" },
  { value: "3000", label: "3.000" },
  { value: "4000", label: "4.000" },
];

/* ── Validação ── */
function validate(form: FormState): string[] {
  const errors: string[] = [];
  if ((form.keyword?.trim() || "").length < 2)
    errors.push("Palavra-chave deve ter ao menos 2 caracteres");
  if ((form.niche?.trim() || "").length < 2) errors.push("Nicho é obrigatório");
  const tw = parseInt(form.target_words);
  if (tw && (tw < 1500 || tw > 4000)) errors.push("Palavras-alvo: 1500 a 4000");
  return errors;
}

/* ── Campo de input estilizado ── */
function Field({
  label,
  hint,
  optional,
  icon: Icon,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="gen-field">
      <label className="gen-label">
        {Icon && <Icon size={12} className="gen-label-icon" />}
        {label}
        {optional && <span className="gen-optional">opcional</span>}
      </label>
      {children}
      {hint && <span className="gen-hint">{hint}</span>}
    </div>
  );
}

/* ── Select chip row ── */
function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="gen-chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`gen-chip ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.hint && <span className="gen-chip-hint">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Main ── */
export default function GenerationNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { blog } = useBlog();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const oppId = searchParams.get("opp_id") || "";
  const source = searchParams.get("source") || "";

  const [form, setForm] = useState<FormState>({
    keyword: searchParams.get("keyword") || "",
    city: searchParams.get("city") || "",
    state: "",
    niche: searchParams.get("niche") || "",
    intent: "auto",
    target_words: "2500",
    tone: "profissional",
    person: "nós",
    business_name: "",
    phone: "",
    whatsapp: "",
    website: "",
    avoid: "",
  });

  useEffect(() => {
    const kw = searchParams.get("keyword");
    const nc = searchParams.get("niche");
    const ct = searchParams.get("city");
    if (kw || nc || ct) {
      setForm((prev) => ({
        ...prev,
        keyword: kw || prev.keyword,
        niche: nc || prev.niche,
        city: ct || prev.city,
      }));
    }
  }, [searchParams]);

  const set = (k: keyof FormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const errors = validate(form);
  const isValid = errors.length === 0;

  const handleSubmit = async () => {
    if (!isValid) {
      errors.forEach((e) => toast.error(e));
      return;
    }
    if (!blog?.id) {
      toast.error("Blog não encontrado. Configure em Configurações da Empresa.");
      return;
    }

    const trimmedKeyword = form.keyword.trim();
    const blogId = blog.id;

    // Anti-duplicação
    try {
      const { data: existingJobs } = await supabase
        .from("generation_jobs")
        .select("id, status, input")
        .eq("blog_id", blogId)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false });

      const normalized = trimmedKeyword.toLowerCase();
      const dup = existingJobs?.find((job) => {
        const ji = job.input as Record<string, unknown> | null;
        return ((ji?.keyword as string) || "").trim().toLowerCase() === normalized;
      });

      if (dup) {
        toast.info("Já existe uma geração em andamento para esta keyword.");
        navigate(`/client/articles/engine/${dup.id}`);
        return;
      }
    } catch (e) {
      console.warn("[FRONT:ANTI_DUP] Error checking duplicates, proceeding", e);
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        keyword: trimmedKeyword,
        blog_id: blogId,
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        country: "BR",
        language: "pt-BR",
        niche: form.niche.trim(),
        job_type: "article",
        intent: form.intent === "auto" ? "informational" : form.intent,
        target_words: parseInt(form.target_words),
        image_count: 4,
        brand_voice: {
          tone: form.tone,
          person: form.person,
          avoid: form.avoid ? form.avoid.split(",").map((s) => s.trim()) : [],
        },
      };
      if (source) payload.source = source;
      if (oppId) payload.opportunity_id = oppId;
      if (form.business_name) {
        payload.business = {
          name: form.business_name,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          website: form.website || undefined,
        };
      }

      const { data, error } = await supabase.functions.invoke(
        "create-generation-job",
        { body: payload }
      );

      if (error) {
        const msg = error.message || "";
        if (msg.includes("MAX_CONCURRENT_JOBS") || msg.includes("429")) {
          toast.warning("Você já tem artigos em geração. Aguarde a conclusão.");
        } else if (msg.includes("402")) {
          toast.warning("Créditos insuficientes. Atualize seu plano.");
        } else {
          toast.error("Erro ao criar artigo. Tente novamente.");
        }
        return;
      }

      if (data?.job_id) {
        toast.success("✨ Artigo em geração!");
        if (source === "radar_v3" && oppId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("radar_v3_opportunities")
            .update({ status: "generating", generation_job_id: data.job_id })
            .eq("id", oppId)
            .then(({ error: updErr }: { error: { message: string } | null }) => {
              if (updErr)
                console.warn(
                  "[GenerationNew] radar_v3_opportunities update failed:",
                  updErr.message
                );
            });
        }
        navigate(`/client/articles/engine/${data.job_id}`);
      } else {
        toast.error(data?.error || "Erro desconhecido");
      }
    } catch (e) {
      toast.error("Erro ao criar artigo. Tente novamente.");
      console.error(`[FRONT:JOB_ERROR]`, e);
    } finally {
      setLoading(false);
    }
  };

  const firstName =
    user?.user_metadata?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "você";

  return (
    <div className="gen-root">
      {/* Orbs de fundo */}
      <div className="gen-orb gen-orb-1" aria-hidden />
      <div className="gen-orb gen-orb-2" aria-hidden />

      <div className="gen-container">
        {/* Back */}
        <button
          type="button"
          className="gen-back"
          onClick={() => navigate("/client/articles/engine")}
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        {/* Header */}
        <div className="gen-header">
          <div className="gen-header-badge">
            <Sparkles size={12} />
            IA Gerativa
          </div>
          <h1 className="gen-title">
            Gerar novo artigo
          </h1>
          <p className="gen-subtitle">
            Olá, {firstName}! Informe a palavra-chave e deixa a IA fazer o
            trabalho pesado.
          </p>
        </div>

        {/* Card principal */}
        <div className="gen-card">
          {/* ── Seção 1: Conteúdo ── */}
          <div className="gen-section">
            <div className="gen-section-title">
              <Search size={14} />
              Sobre o artigo
            </div>

            <Field
              label="Palavra-chave principal"
              icon={Search}
              hint="Frase ou termo que seu público pesquisa no Google"
            >
              <div className="gen-input-wrap">
                <Search size={14} className="gen-input-icon" />
                <input
                  type="text"
                  placeholder="ex: como contratar encanador em São Paulo"
                  value={form.keyword}
                  onChange={(e) => set("keyword", e.target.value)}
                  className="gen-input"
                  autoFocus
                />
              </div>
            </Field>

            <div className="gen-grid-2">
              <Field label="Cidade" icon={MapPin} optional>
                <div className="gen-input-wrap">
                  <MapPin size={14} className="gen-input-icon" />
                  <input
                    type="text"
                    placeholder="ex: São Paulo"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    className="gen-input"
                  />
                </div>
              </Field>
              <Field label="Estado" icon={MapPin} optional>
                <div className="gen-input-wrap">
                  <MapPin size={14} className="gen-input-icon" />
                  <input
                    type="text"
                    placeholder="ex: SP"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    className="gen-input"
                    maxLength={2}
                  />
                </div>
              </Field>
            </div>

            <Field label="Nicho / segmento" icon={Tag}>
              <div className="gen-input-wrap">
                <Tag size={14} className="gen-input-icon" />
                <input
                  type="text"
                  placeholder="ex: controle de pragas, advocacia, encanamento"
                  value={form.niche}
                  onChange={(e) => set("niche", e.target.value)}
                  className="gen-input"
                />
              </div>
            </Field>
          </div>

          {/* ── Seção 2: Configurações ── */}
          <div className="gen-section">
            <div className="gen-section-title">
              <Settings2 size={14} />
              Configurações do artigo
            </div>

            <Field label="Intenção de busca" icon={Target}>
              <ChipRow
                options={INTENTS}
                value={form.intent}
                onChange={(v) => set("intent", v)}
              />
            </Field>

            <Field label="Tamanho do artigo" icon={FileText}>
              <ChipRow
                options={WORDS}
                value={form.target_words}
                onChange={(v) => set("target_words", v)}
              />
            </Field>

            <div className="gen-grid-2">
              <Field label="Tom de voz" icon={Mic}>
                <ChipRow
                  options={TONES}
                  value={form.tone}
                  onChange={(v) => set("tone", v)}
                />
              </Field>
              <Field label="Pessoa do discurso" icon={Mic}>
                <ChipRow
                  options={[
                    { value: "nós", label: "Nós (empresa)" },
                    { value: "eu", label: "Eu (blog)" },
                    { value: "você", label: "Você" },
                  ]}
                  value={form.person}
                  onChange={(v) => set("person", v)}
                />
              </Field>
            </div>
          </div>

          {/* ── Seção 3: Avançado (colapsável) ── */}
          <button
            type="button"
            className="gen-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Dados da empresa (opcional — melhora o artigo)
          </button>

          {showAdvanced && (
            <div className="gen-section gen-advanced">
              <div className="gen-grid-2">
                <Field label="Nome da empresa" icon={Building2} optional>
                  <div className="gen-input-wrap">
                    <Building2 size={14} className="gen-input-icon" />
                    <input
                      type="text"
                      placeholder="ex: DedetPro"
                      value={form.business_name}
                      onChange={(e) => set("business_name", e.target.value)}
                      className="gen-input"
                    />
                  </div>
                </Field>
                <Field label="Telefone" icon={Phone} optional>
                  <div className="gen-input-wrap">
                    <Phone size={14} className="gen-input-icon" />
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className="gen-input"
                    />
                  </div>
                </Field>
              </div>
              <div className="gen-grid-2">
                <Field label="WhatsApp" icon={Phone} optional>
                  <div className="gen-input-wrap">
                    <Phone size={14} className="gen-input-icon" />
                    <input
                      type="text"
                      placeholder="5511999999999"
                      value={form.whatsapp}
                      onChange={(e) => set("whatsapp", e.target.value)}
                      className="gen-input"
                    />
                  </div>
                </Field>
                <Field label="Website" icon={Globe} optional>
                  <div className="gen-input-wrap">
                    <Globe size={14} className="gen-input-icon" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                      className="gen-input"
                    />
                  </div>
                </Field>
              </div>
              <Field
                label="Palavras a evitar"
                icon={AlertCircle}
                optional
                hint="Separe por vírgulas"
              >
                <div className="gen-input-wrap">
                  <AlertCircle size={14} className="gen-input-icon" />
                  <input
                    type="text"
                    placeholder="ex: barato, desconto, grátis"
                    value={form.avoid}
                    onChange={(e) => set("avoid", e.target.value)}
                    className="gen-input"
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ── Erros de validação ── */}
          {errors.length > 0 && form.keyword.length > 0 && (
            <div className="gen-errors">
              {errors.map((e, i) => (
                <div key={i} className="gen-error-item">
                  <AlertCircle size={12} />
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* ── CTA ── */}
          <button
            type="button"
            className="gen-cta"
            onClick={handleSubmit}
            disabled={loading || !isValid}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="gen-cta-spin" />
                Criando artigo...
              </>
            ) : (
              <>
                <Zap size={16} />
                Gerar artigo com IA
                <ArrowRight size={14} className="gen-cta-arrow" />
              </>
            )}
          </button>

          <p className="gen-cta-hint">
            Seu artigo ficará pronto em aproximadamente 2–5 minutos
          </p>
        </div>
      </div>
    </div>
  );
}
