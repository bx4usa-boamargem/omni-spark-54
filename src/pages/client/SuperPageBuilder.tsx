import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sparkles,
    Loader2,
    ArrowLeft,
    Search,
    MapPin,
    Link as LinkIcon,
    Image as ImageIcon,
    MousePointerClick,
    MonitorPlay,
    Settings2,
    LayoutTemplate
} from 'lucide-react';
import { toast } from 'sonner';
import { useBlog } from '@/hooks/useBlog';
import { supabase } from '@/integrations/supabase/client';
import { NicheSelectorDropdown } from '@/components/client/NicheSelectorDropdown';
import type { NicheType } from '@/lib/article-engine/types';

const STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface SuperPageFormData {
    keyword: string;
    cloneUrl: string;
    city: string;
    state: string;
    niche: NicheType | 'default' | string;
    targetWords: '1000' | '1500' | '2000' | '2500' | '3500' | '5000';
    tone: string;
    pointOfView: string;
    includeImages: boolean;
    imageCount: number;
    imageStyle: string;
    includeYoutube: boolean;
    includeMapEmbed: boolean;
    includeFaq: boolean;
    ctaText: string;
    ctaUrl: string;
    optimizeNLP: boolean;
}

export default function SuperPageBuilder() {
    const navigate = useNavigate();
    const { blog } = useBlog();

    const [formData, setFormData] = useState<SuperPageFormData>({
        keyword: '',
        cloneUrl: '',
        city: '',
        state: 'SP',
        niche: 'default',
        targetWords: '2000',
        tone: 'professional',
        pointOfView: 'we',
        includeImages: true,
        imageCount: 4,
        imageStyle: 'cinematic',
        includeYoutube: true,
        includeMapEmbed: true,
        includeFaq: true,
        ctaText: 'Solicite um Orçamento Agora',
        ctaUrl: '',
        optimizeNLP: true
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const isMounted = useRef(true);

    // Validation
    const isValid = formData.keyword.trim().length >= 3;

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleInputChange = (field: keyof SuperPageFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        if (!isValid) return;
        if (!blog) {
            toast.error('Blog não encontrado. Configure a empresa em Configurações da Empresa.');
            return;
        }

        setIsGenerating(true);

        try {
            const payload = {
                keyword: formData.keyword.trim(),
                blog_id: blog.id,
                city: formData.city.trim() || undefined,
                state: formData.state || undefined,
                niche: formData.niche,
                target_words: parseInt(formData.targetWords),
                clone_url: formData.cloneUrl.trim() || undefined,
                features: {
                    images: formData.includeImages ? formData.imageCount : 0,
                    image_style: formData.imageStyle,
                    youtube: formData.includeYoutube,
                    map_embed: formData.includeMapEmbed,
                    faq: formData.includeFaq,
                    nlp_terms: formData.optimizeNLP,
                },
                cta: {
                    text: formData.ctaText || 'Agende Agora',
                    url: formData.ctaUrl || undefined
                },
                tone: formData.tone,
                point_of_view: formData.pointOfView,
                job_type: 'super_page'
            };

            console.log('[SuperPageBuilder] Sending payload:', payload);

            const { data, error } = await supabase.functions.invoke('create-generation-job', { body: payload });

            if (error) throw error;
            if (!data?.job_id) throw new Error(data?.error || 'Resposta inválida do servidor');

            if (isMounted.current) {
                toast.success('Super Page em geração! Acompanhe o progresso.');
                navigate(`/client/articles/engine/${data.job_id}`);
            }
        } catch (err: any) {
            console.error('[SuperPageBuilder] Error:', err);
            if (isMounted.current) {
                toast.error(err?.message || 'Erro ao iniciar geração. Verifique os limites.');
                setIsGenerating(false);
            }
        }
    };

    return (
        <div className="container max-w-5xl py-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/client/articles')}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                        1-Click Super Page Builder
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Crie artigos imbatíveis com Inteligência Artificial baseados em PAA do Google, LSI Keywords, imagens e vídeos automáticos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Form Sections */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Main Keyword & Clone */}
                    <Card className="border-primary/20 bg-card">
                        <CardHeader className="bg-primary/5 pb-4 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary" />
                                Keyword & Clonagem
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="keyword" className="font-semibold text-base">
                                    Palavra-chave Principal <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="keyword"
                                    placeholder="Ex: melhor software de gestão para varejo 2026"
                                    value={formData.keyword}
                                    onChange={(e) => handleInputChange('keyword', e.target.value)}
                                    disabled={isGenerating}
                                    className="h-12 text-lg"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label htmlFor="cloneUrl" className="flex items-center gap-2 font-medium">
                                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                    URL do Concorrente (1-Click Clone) - <span className="text-muted-foreground font-normal text-xs">Opcional</span>
                                </Label>
                                <Input
                                    id="cloneUrl"
                                    placeholder="https://..."
                                    value={formData.cloneUrl}
                                    onChange={(e) => handleInputChange('cloneUrl', e.target.value)}
                                    disabled={isGenerating}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Se informado, a IA extrairá a estrutura de H2/H3 (Outline) desta URL e criará conteúdo superior e original.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Local SEO & Niche */}
                    <Card>
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-green-500" />
                                Local SEO & Nicho
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cidade <span className="text-muted-foreground font-normal text-xs">(Opcional)</span></Label>
                                    <Input
                                        placeholder="Ex: São Paulo"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estado</Label>
                                    <Select value={formData.state} onValueChange={(v) => handleInputChange('state', v)} disabled={isGenerating}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Nicho Especialista</Label>
                                <NicheSelectorDropdown
                                    value={formData.niche as NicheType}
                                    onChange={(value) => handleInputChange('niche', value)}
                                    disabled={isGenerating}
                                />
                                <p className="text-xs text-muted-foreground">O modelo NLP se ajustará para as jargões e LSI keywords deste nicho.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Call To Action */}
                    <Card>
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MousePointerClick className="h-5 w-5 text-orange-500" />
                                Converta Leitores (CTA)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Texto do Botão / Chamada</Label>
                                    <Input
                                        placeholder="Agende um Teste Grátis"
                                        value={formData.ctaText}
                                        onChange={(e) => handleInputChange('ctaText', e.target.value)}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>URL de Destino</Label>
                                    <Input
                                        placeholder="https://suaempresa.com.br/contato"
                                        value={formData.ctaUrl}
                                        onChange={(e) => handleInputChange('ctaUrl', e.target.value)}
                                        disabled={isGenerating}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Configuration Switches */}
                <div className="space-y-6">

                    {/* Article Specs */}
                    <Card>
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Settings2 className="h-5 w-5" />
                                Especificações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label>Tamanho do Artigo</Label>
                                <Select value={formData.targetWords} onValueChange={(v) => handleInputChange('targetWords', v)} disabled={isGenerating}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">Pequeno (1.000 words)</SelectItem>
                                        <SelectItem value="1500">Padrão (1.500 words)</SelectItem>
                                        <SelectItem value="2000">Completo (2.000 words)</SelectItem>
                                        <SelectItem value="2500">Super Page (2.500 words)</SelectItem>
                                        <SelectItem value="3500">Pillar Page (3.500 words)</SelectItem>
                                        <SelectItem value="5000">Ultimate Guide (5.000 words)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tom de Voz</Label>
                                <Select value={formData.tone} onValueChange={(v) => handleInputChange('tone', v)} disabled={isGenerating}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Profissional & Confiável</SelectItem>
                                        <SelectItem value="conversational">Amigável & Conversacional</SelectItem>
                                        <SelectItem value="educational">Educacional (Wikipedia)</SelectItem>
                                        <SelectItem value="persuasive">Direto & Persuasivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Ponto de Vista</Label>
                                <Select value={formData.pointOfView} onValueChange={(v) => handleInputChange('pointOfView', v)} disabled={isGenerating}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="we">Nós (Empresa/Equipe)</SelectItem>
                                        <SelectItem value="i">Eu (Especialista Único)</SelectItem>
                                        <SelectItem value="third">Terceira Pessoa (Neutro)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Media & Enhancements */}
                    <Card>
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <LayoutTemplate className="h-5 w-5 text-purple-500" />
                                Elementos de Mídia & SEO
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" /> Imagens AI
                                    </Label>
                                    <p className="text-xs text-muted-foreground mr-4">Imagens fotorrealistas ou ilustrativas geradas na hora.</p>
                                </div>
                                <Switch checked={formData.includeImages} onCheckedChange={(c) => handleInputChange('includeImages', c)} disabled={isGenerating} />
                            </div>

                            {formData.includeImages && (
                                <div className="pl-6 space-y-4 border-l-2 ml-2 pb-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <Label className="text-xs">Quantidade:</Label>
                                        <Input
                                            type="number" min="1" max="15"
                                            value={formData.imageCount}
                                            onChange={(e) => handleInputChange('imageCount', parseInt(e.target.value) || 1)}
                                            className="w-20 h-8"
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        <Label className="text-xs">Estilo Visual:</Label>
                                        <Select value={formData.imageStyle} onValueChange={(v) => handleInputChange('imageStyle', v)} disabled={isGenerating}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cinematic">Cinemático Fotorrealista</SelectItem>
                                                <SelectItem value="illustration">Ilustração Moderna (Vetor)</SelectItem>
                                                <SelectItem value="3d">Render 3D</SelectItem>
                                                <SelectItem value="minimalist">Minimalista Claro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <MonitorPlay className="h-4 w-4 text-red-500" /> YouTube Embeds
                                    </Label>
                                    <p className="text-xs text-muted-foreground mr-4">Busca e insere o melhor vídeo público sobre o tema.</p>
                                </div>
                                <Switch checked={formData.includeYoutube} onCheckedChange={(c) => handleInputChange('includeYoutube', c)} disabled={isGenerating} />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-emerald-500" /> Google Maps Embed
                                    </Label>
                                    <p className="text-xs text-muted-foreground mr-4">Insere mapa da cidade ou negócio para SEO Local.</p>
                                </div>
                                <Switch checked={formData.includeMapEmbed} onCheckedChange={(c) => handleInputChange('includeMapEmbed', c)} disabled={isGenerating} />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium">FAQ (Questions & Answers)</Label>
                                    <p className="text-xs text-muted-foreground mr-4">Gera schema JSON-LD e seção FAQ baseada em PAA do Google.</p>
                                </div>
                                <Switch checked={formData.includeFaq} onCheckedChange={(c) => handleInputChange('includeFaq', c)} disabled={isGenerating} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium">NLP & LSI Optimization</Label>
                                    <p className="text-xs text-muted-foreground mr-4">Inclui TF-IDF terms forçando densidade co-semântica.</p>
                                </div>
                                <Switch checked={formData.optimizeNLP} onCheckedChange={(c) => handleInputChange('optimizeNLP', c)} disabled={isGenerating} />
                            </div>

                        </CardContent>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full text-lg h-14 gradient-primary shadow-lg shadow-primary/30 font-bold tracking-wide"
                        onClick={handleGenerate}
                        disabled={!isValid || isGenerating}
                    >
                        {isGenerating ? (
                            <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processando Super Page...</>
                        ) : (
                            <><Sparkles className="mr-2 h-6 w-6" /> Gerar Super Page</>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        A geração de uma Super Page pode levar entre 2 a 5 minutos utilizando a arquitetura de múltiplos agentes.
                    </p>
                </div>

            </div>
        </div>
    );
}
