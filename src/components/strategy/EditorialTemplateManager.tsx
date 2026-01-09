import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, GripVertical, Loader2, Check, FileText, Sparkles, Target, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MandatorySection {
  heading: string;
  key_message: string;
}

interface SeoSettings {
  main_keyword: string;
  secondary_keywords: string[];
  search_intent: string;
}

interface ImageGuidelines {
  cover: string;
  internal: string;
  style: string;
}

interface EditorialTemplate {
  id?: string;
  blog_id: string;
  name: string;
  is_default: boolean;
  target_niche: string;
  content_focus: string;
  mandatory_structure: MandatorySection[];
  title_guidelines: string;
  tone_rules: string;
  seo_settings: SeoSettings;
  cta_template: string;
  image_guidelines: ImageGuidelines;
  category_default: string;
  company_name: string;
}

interface EditorialTemplateManagerProps {
  blogId: string;
}

const defaultTemplate: Omit<EditorialTemplate, 'id' | 'blog_id'> = {
  name: "Template ClickOne - Empresas de Serviços",
  is_default: true,
  target_niche: "empresas de serviços (cleaning, HVAC, construction, clinics, home services)",
  content_focus: "problema real com impacto financeiro direto, linguagem simples, dor imediata percebida pelo empresário",
  mandatory_structure: [
    { heading: "[Problema] está custando clientes à sua empresa", key_message: "Muitas vendas são perdidas antes de começar" },
    { heading: "Por que [problema] vira clientes perdidos", key_message: "Cliente não espera — ele liga para outro" },
    { heading: "O impacto real no faturamento", key_message: "Pequenas perdas diárias = grandes prejuízos mensais" },
    { heading: "Por que isso acontece com empresas de serviços", key_message: "Não é má gestão, é falta de estrutura" },
    { heading: "Como resolver sem contratar mais funcionários", key_message: "Automação permite atendimento 24/7" },
    { heading: "Como a ClickOne ajuda a resolver", key_message: "Nenhuma oportunidade fica sem resposta" },
  ],
  title_guidelines: "Direto e orientado à dor. Falar com o dono do negócio. Evitar linguagem técnica ou corporativa. Exemplos: 'Quantos clientes sua empresa perde por não atender o telefone?'",
  tone_rules: "Simples, direto, prático. Linguagem de dono de negócio. Conversa real do dia a dia. NÃO soar técnico, corporativo ou acadêmico. Deve parecer uma conversa clara com um empresário que está na operação diária.",
  seo_settings: {
    main_keyword: "[problema] empresas de serviços",
    secondary_keywords: ["perder clientes por [problema]", "atendimento automático empresas serviços", "[problema] negócios locais"],
    search_intent: "Informacional com viés comercial (problema + solução)",
  },
  cta_template: "Experimente a ClickOne grátis por 7 dias e pare de perder clientes hoje mesmo. Sem cartão de crédito.",
  image_guidelines: {
    cover: "Empresário de serviços atendendo cliente enquanto telefone toca. Visual real, cotidiano, não corporativo. Destaque para o problema.",
    internal: "Reforçar problema, rotina real, solução prática",
    style: "Real, cotidiano, profissional mas não corporativo",
  },
  category_default: "Vendas & Atendimento para Empresas de Serviços",
  company_name: "ClickOne",
};

export function EditorialTemplateManager({ blogId }: EditorialTemplateManagerProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EditorialTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EditorialTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [blogId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("editorial_templates")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const parsedTemplates = data.map((t: any) => ({
          ...t,
          mandatory_structure: (t.mandatory_structure || []) as MandatorySection[],
          seo_settings: (t.seo_settings || { main_keyword: "", secondary_keywords: [], search_intent: "" }) as SeoSettings,
          image_guidelines: (t.image_guidelines || { cover: "", internal: "", style: "" }) as ImageGuidelines,
        }));
        setTemplates(parsedTemplates);
        const defaultT = parsedTemplates.find((t: EditorialTemplate) => t.is_default) || parsedTemplates[0];
        setSelectedTemplate(defaultT);
      } else {
        // Create default template
        await createDefaultTemplate();
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTemplate = async () => {
    try {
      const templateData: any = {
        blog_id: blogId,
        name: defaultTemplate.name,
        is_default: defaultTemplate.is_default,
        target_niche: defaultTemplate.target_niche,
        content_focus: defaultTemplate.content_focus,
        mandatory_structure: defaultTemplate.mandatory_structure,
        title_guidelines: defaultTemplate.title_guidelines,
        tone_rules: defaultTemplate.tone_rules,
        seo_settings: defaultTemplate.seo_settings,
        cta_template: defaultTemplate.cta_template,
        image_guidelines: defaultTemplate.image_guidelines,
        category_default: defaultTemplate.category_default,
        company_name: defaultTemplate.company_name,
      };

      const { data, error } = await supabase
        .from("editorial_templates")
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;

      const parsed: EditorialTemplate = {
        ...data,
        mandatory_structure: (data.mandatory_structure || []) as unknown as MandatorySection[],
        seo_settings: (data.seo_settings || { main_keyword: "", secondary_keywords: [], search_intent: "" }) as unknown as SeoSettings,
        image_guidelines: (data.image_guidelines || { cover: "", internal: "", style: "" }) as unknown as ImageGuidelines,
      };
      setTemplates([parsed]);
      setSelectedTemplate(parsed);
      toast({ title: "Template padrão criado!" });
    } catch (error) {
      console.error("Error creating default template:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { id, ...rest } = selectedTemplate;
      const templateData: any = {
        ...rest,
        mandatory_structure: rest.mandatory_structure,
        seo_settings: rest.seo_settings,
        image_guidelines: rest.image_guidelines,
      };

      if (id) {
        const { error } = await supabase
          .from("editorial_templates")
          .update(templateData as any)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("editorial_templates")
          .insert({ blog_id: blogId, ...templateData } as any)
          .select()
          .single();

        if (error) throw error;

        const parsed: EditorialTemplate = {
          ...data,
          mandatory_structure: (data.mandatory_structure || []) as unknown as MandatorySection[],
          seo_settings: (data.seo_settings || { main_keyword: "", secondary_keywords: [], search_intent: "" }) as unknown as SeoSettings,
          image_guidelines: (data.image_guidelines || { cover: "", internal: "", style: "" }) as unknown as ImageGuidelines,
        };
        setTemplates([...templates, parsed]);
        setSelectedTemplate(parsed);
      }

      toast({ title: "Template salvo com sucesso!" });
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Erro ao salvar template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      mandatory_structure: [
        ...selectedTemplate.mandatory_structure,
        { heading: "", key_message: "" },
      ],
    });
  };

  const removeSection = (index: number) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      mandatory_structure: selectedTemplate.mandatory_structure.filter((_, i) => i !== index),
    });
  };

  const updateSection = (index: number, field: keyof MandatorySection, value: string) => {
    if (!selectedTemplate) return;
    const updated = [...selectedTemplate.mandatory_structure];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedTemplate({ ...selectedTemplate, mandatory_structure: updated });
  };

  const addSecondaryKeyword = () => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      seo_settings: {
        ...selectedTemplate.seo_settings,
        secondary_keywords: [...selectedTemplate.seo_settings.secondary_keywords, ""],
      },
    });
  };

  const removeSecondaryKeyword = (index: number) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      seo_settings: {
        ...selectedTemplate.seo_settings,
        secondary_keywords: selectedTemplate.seo_settings.secondary_keywords.filter((_, i) => i !== index),
      },
    });
  };

  const updateSecondaryKeyword = (index: number, value: string) => {
    if (!selectedTemplate) return;
    const updated = [...selectedTemplate.seo_settings.secondary_keywords];
    updated[index] = value;
    setSelectedTemplate({
      ...selectedTemplate,
      seo_settings: { ...selectedTemplate.seo_settings, secondary_keywords: updated },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Nenhum template encontrado</h3>
          <Button onClick={createDefaultTemplate}>Criar Template Padrão</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
          {selectedTemplate.is_default && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Padrão
            </Badge>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="space-y-6 pr-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Template</Label>
                  <Input
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={selectedTemplate.company_name}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, company_name: e.target.value })}
                    placeholder="Ex: ClickOne"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nicho Alvo</Label>
                <Input
                  value={selectedTemplate.target_niche}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, target_niche: e.target.value })}
                  placeholder="Ex: empresas de serviços"
                />
              </div>
              <div className="space-y-2">
                <Label>Foco do Conteúdo</Label>
                <Textarea
                  value={selectedTemplate.content_focus}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content_focus: e.target.value })}
                  placeholder="Descreva o foco principal do conteúdo..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria Padrão</Label>
                <Input
                  value={selectedTemplate.category_default}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, category_default: e.target.value })}
                  placeholder="Ex: Vendas & Atendimento"
                />
              </div>
            </CardContent>
          </Card>

          {/* Mandatory Structure */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Estrutura Obrigatória (H2)</CardTitle>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate.mandatory_structure.map((section, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={section.heading}
                      onChange={(e) => updateSection(index, "heading", e.target.value)}
                      placeholder="Título da seção (H2)"
                    />
                    <Input
                      value={section.key_message}
                      onChange={(e) => updateSection(index, "key_message", e.target.value)}
                      placeholder="Mensagem-chave da seção"
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeSection(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Title & Tone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diretrizes de Título e Tom</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Diretrizes de Título</Label>
                <Textarea
                  value={selectedTemplate.title_guidelines}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, title_guidelines: e.target.value })}
                  placeholder="Regras para criação de títulos..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Regras de Tom de Voz</Label>
                <Textarea
                  value={selectedTemplate.tone_rules}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, tone_rules: e.target.value })}
                  placeholder="Descreva o tom de voz esperado..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações de SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Palavra-chave Principal</Label>
                <Input
                  value={selectedTemplate.seo_settings.main_keyword}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      seo_settings: { ...selectedTemplate.seo_settings, main_keyword: e.target.value },
                    })
                  }
                  placeholder="Ex: [problema] empresas de serviços"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Palavras-chave Secundárias</Label>
                  <Button variant="ghost" size="sm" onClick={addSecondaryKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedTemplate.seo_settings.secondary_keywords.map((kw, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={kw}
                        onChange={(e) => updateSecondaryKeyword(index, e.target.value)}
                        placeholder="Palavra-chave secundária"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeSecondaryKeyword(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Intenção de Busca</Label>
                <Input
                  value={selectedTemplate.seo_settings.search_intent}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      seo_settings: { ...selectedTemplate.seo_settings, search_intent: e.target.value },
                    })
                  }
                  placeholder="Ex: Informacional com viés comercial"
                />
              </div>
            </CardContent>
          </Card>

          {/* CTA Template - Dedicated Section */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Template de CTA Personalizado</CardTitle>
              </div>
              <CardDescription>
                Configure o CTA padrão para todos os artigos. A IA usará este template como base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  CTA Principal
                  <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                </Label>
                <Textarea
                  value={selectedTemplate.cta_template}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, cta_template: e.target.value })}
                  placeholder="Ex: Experimente a [empresa] grátis e pare de perder clientes hoje mesmo."
                  rows={3}
                  className="font-medium"
                />
              </div>

              {/* CTA Examples */}
              <div className="rounded-lg border bg-background p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  Exemplos de CTAs eficazes
                </div>
                <div className="space-y-1.5 text-sm">
                  <div 
                    className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setSelectedTemplate({ 
                      ...selectedTemplate, 
                      cta_template: `Experimente a ${selectedTemplate.company_name} grátis por 7 dias e pare de perder clientes hoje mesmo. Sem cartão de crédito.` 
                    })}
                  >
                    "Experimente a {selectedTemplate.company_name || '[empresa]'} grátis por 7 dias e pare de perder clientes hoje mesmo."
                  </div>
                  <div 
                    className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setSelectedTemplate({ 
                      ...selectedTemplate, 
                      cta_template: `Fale com um especialista da ${selectedTemplate.company_name} e descubra como automatizar seu atendimento em menos de 5 minutos.` 
                    })}
                  >
                    "Fale com um especialista da {selectedTemplate.company_name || '[empresa]'} e descubra como automatizar seu atendimento."
                  </div>
                  <div 
                    className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setSelectedTemplate({ 
                      ...selectedTemplate, 
                      cta_template: `Comece agora com a ${selectedTemplate.company_name} e nunca mais perca um cliente por falta de resposta.` 
                    })}
                  >
                    "Comece agora com a {selectedTemplate.company_name || '[empresa]'} e nunca mais perca um cliente por falta de resposta."
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clique em um exemplo para usá-lo como base
                </p>
              </div>

              {/* CTA Tips */}
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Dicas para um bom CTA:</strong>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs">
                    <li>Use verbos de ação: "Experimente", "Comece", "Descubra"</li>
                    <li>Mencione o benefício principal (ex: "pare de perder clientes")</li>
                    <li>Remova objeções (ex: "sem cartão", "grátis por 7 dias")</li>
                    <li>Crie urgência (ex: "hoje mesmo", "agora")</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diretrizes de Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Diretrizes de Imagem de Capa</Label>
                <Textarea
                  value={selectedTemplate.image_guidelines.cover}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      image_guidelines: { ...selectedTemplate.image_guidelines, cover: e.target.value },
                    })
                  }
                  placeholder="Descreva a imagem de capa ideal..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Diretrizes de Imagens Internas</Label>
                <Textarea
                  value={selectedTemplate.image_guidelines.internal}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      image_guidelines: { ...selectedTemplate.image_guidelines, internal: e.target.value },
                    })
                  }
                  placeholder="Descreva as imagens internas..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Estilo Visual</Label>
                <Input
                  value={selectedTemplate.image_guidelines.style}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      image_guidelines: { ...selectedTemplate.image_guidelines, style: e.target.value },
                    })
                  }
                  placeholder="Ex: Real, cotidiano, profissional"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
