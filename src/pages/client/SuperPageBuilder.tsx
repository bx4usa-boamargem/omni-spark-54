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

            // A edge function pode retornar graph_id (pipeline DAG) ou job_id (pipeline legado)
            const jobId = data?.job_id || data?.graph_id;
            if (!jobId) throw new Error(data?.error || 'Resposta inválida do servidor');

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
        <div className="relative min-h-[calc(100vh-4rem)]">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

            <div className="container max-w-5xl py-8 space-y-10 relative">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate('/client/articles')}
                            className="rounded-full h-12 w-12 border-border/40 bg-background/50 backdrop-blur-md shadow-sm hover:translate-x-[-2px] transition-transform"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center md:justify-start gap-3">
                                <h1 className="text-4xl font-black tracking-tighter text-foreground">Super Page <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent italic">Elite</span></h1>
                                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">v3 engine</span>
                            </div>
                            <p className="text-muted-foreground text-sm font-medium max-w-md">
                                Arquitetura de 8 agentes para criar conteúdo que domina o Top 10 e converte em escala industrial.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Form Sections */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Main Keyword & Clone */}
                        <Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl overflow-hidden group transition-all hover:border-primary/30">
                            <CardHeader className="bg-primary/5 pb-4 border-b border-border/40">
                                <CardTitle className="text-xl flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                        <Search className="h-5 w-5" />
                                    </div>
                                    Keyword & Clonagem Elite
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-8">
                                <div className="space-y-3">
                                    <Label htmlFor="keyword" className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        Palavra-chave Principal
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    </Label>
                                    <Input
                                        id="keyword"
                                        placeholder="Ex: melhor software de gestão para varejo 2026"
                                        value={formData.keyword}
                                        onChange={(e) => handleInputChange('keyword', e.target.value)}
                                        disabled={isGenerating}
                                        className="h-14 text-xl font-medium bg-background/50 border-border/40 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Mínimo 3 caracteres para ativar o motor</p>
                                </div>

                                <Separator className="bg-border/40" />

                                <div className="space-y-3 pt-2">
                                    <Label htmlFor="cloneUrl" className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                        <LinkIcon className="h-4 w-4" />
                                        Competitive Clone URL <span className="text-[10px] font-normal lowercase">(opcional)</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="cloneUrl"
                                            placeholder="https://site-do-concorrente.com/artigo-que-voce-quer-bater"
                                            value={formData.cloneUrl}
                                            onChange={(e) => handleInputChange('cloneUrl', e.target.value)}
                                            disabled={isGenerating}
                                            className="h-12 bg-background/30 border-border/30 pl-4 pr-12 font-mono text-sm"
                                        />
                                        {formData.cloneUrl && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                                <Sparkles className="h-3 w-3" />
                                                PRONTO
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                            Nosso agente entrará via <strong>Firecrawl</strong> nesta URL, mapeará os H2/H3 e criará uma estrutura 2.5x mais rica e atualizada.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Local SEO & Nicho */}
                        <Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-lg transition-all hover:border-green-500/30">
                            <CardHeader className="bg-green-500/5 pb-4 border-b border-border/40">
                                <CardTitle className="text-xl flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    Local SEO & Nicho
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Cidade Estratégica</Label>
                                        <Input
                                            placeholder="Ex: São Paulo"
                                            value={formData.city}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            disabled={isGenerating}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Estado</Label>
                                        <Select value={formData.state} onValueChange={(v) => handleInputChange('state', v)} disabled={isGenerating}>
                                            <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Especialidade do Agente</Label>
                                    <NicheSelectorDropdown
                                        value={formData.niche as NicheType}
                                        onChange={(value) => handleInputChange('niche', value)}
                                        disabled={isGenerating}
                                    />
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 pl-1">A IA usará terminologia técnica de {formData.niche === 'default' ? 'Negócios' : formData.niche}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CTA Section */}
                        <Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-lg transition-all hover:border-orange-500/30">
                            <CardHeader className="bg-orange-500/5 pb-4 border-b border-border/40">
                                <CardTitle className="text-xl flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                        <MousePointerClick className="h-5 w-5" />
                                    </div>
                                    Conversão (CTA)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Texto do Botão Magneto</Label>
                                        <Input
                                            placeholder="Agende um Teste Grátis"
                                            value={formData.ctaText}
                                            onChange={(e) => handleInputChange('ctaText', e.target.value)}
                                            disabled={isGenerating}
                                            className="bg-background/50 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Destino do Lead</Label>
                                        <Input
                                            placeholder="https://suaempresa.com.br/contato"
                                            value={formData.ctaUrl}
                                            onChange={(e) => handleInputChange('ctaUrl', e.target.value)}
                                            disabled={isGenerating}
                                            className="bg-background/50 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column: Configuration Switches */}
                    <div className="space-y-6">

                        {/* Article Specs */}
                        <Card className="border-border/40 bg-card/60 backdrop-blur-md">
                            <CardHeader className="pb-4 border-b bg-muted/20">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Settings2 className="h-4 w-4" />
                                    Specs de Saída
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Impacto Content</Label>
                                    <Select value={formData.targetWords} onValueChange={(v) => handleInputChange('targetWords', v)} disabled={isGenerating}>
                                        <SelectTrigger className="bg-background/50 font-semibold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1000">Pequeno (1.000 words)</SelectItem>
                                            <SelectItem value="1500">Padrão (1.500 words)</SelectItem>
                                            <SelectItem value="2000">Completo (2.000 words)</SelectItem>
                                            <SelectItem value="2500">Super Page (2.500 words)</SelectItem>
                                            <SelectItem value="3500" className="text-primary font-bold">Pillar Page (3.500+)</SelectItem>
                                            <SelectItem value="5000" className="text-violet-500 font-black italic">Ultimate Guide (5k)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Voz da Marca</Label>
                                    <Select value={formData.tone} onValueChange={(v) => handleInputChange('tone', v)} disabled={isGenerating}>
                                        <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="professional">Profissional & Confiável</SelectItem>
                                            <SelectItem value="conversational">Amigável & Conversacional</SelectItem>
                                            <SelectItem value="educational">Educacional (Wikipedia)</SelectItem>
                                            <SelectItem value="persuasive">Direto & Persuasivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Perspectiva</Label>
                                    <Select value={formData.pointOfView} onValueChange={(v) => handleInputChange('pointOfView', v)} disabled={isGenerating}>
                                        <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
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
                        <Card className="border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                            <CardHeader className="pb-4 border-b bg-purple-500/5">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <LayoutTemplate className="h-4 w-4 text-purple-500" />
                                    Boosts de SEO
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-6">

                                <div className="flex items-center justify-between group">
                                    <div>
                                        <Label className="text-sm font-bold flex items-center gap-2 mb-1">
                                            <ImageIcon className="h-4 w-4 text-primary" /> Imagens AI
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Geradas no Flux / Midjourney</p>
                                    </div>
                                    <Switch checked={formData.includeImages} onCheckedChange={(c) => handleInputChange('includeImages', c)} disabled={isGenerating} />
                                </div>

                                {formData.includeImages && (
                                    <div className="pl-5 space-y-4 border-l border-primary/20 ml-2 animate-in slide-in-from-left-2 duration-300">
                                        <div className="flex items-center justify-between gap-4">
                                            <Label className="text-[10px] font-bold">Lote:</Label>
                                            <Input
                                                type="number" min="1" max="15"
                                                value={formData.imageCount}
                                                onChange={(e) => handleInputChange('imageCount', parseInt(e.target.value) || 1)}
                                                className="w-16 h-7 text-xs bg-background/50"
                                                disabled={isGenerating}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold">Estilo:</Label>
                                            <Select value={formData.imageStyle} onValueChange={(v) => handleInputChange('imageStyle', v)} disabled={isGenerating}>
                                                <SelectTrigger className="h-7 text-[10px] bg-background/30"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cinematic">Cinemático</SelectItem>
                                                    <SelectItem value="illustration">Vetor</SelectItem>
                                                    <SelectItem value="3d">Render 3D</SelectItem>
                                                    <SelectItem value="minimalist">Clean</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                <Separator className="bg-border/20" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-bold flex items-center gap-2 mb-1">
                                            <MonitorPlay className="h-4 w-4 text-red-500" /> YouTube Loop
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Embed Contextual</p>
                                    </div>
                                    <Switch checked={formData.includeYoutube} onCheckedChange={(c) => handleInputChange('includeYoutube', c)} disabled={isGenerating} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-bold flex items-center gap-2 mb-1">
                                            <LayoutTemplate className="h-4 w-4 text-violet-500" /> FAQ Engine
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">PAA & JSON-LD</p>
                                    </div>
                                    <Switch checked={formData.includeFaq} onCheckedChange={(c) => handleInputChange('includeFaq', c)} disabled={isGenerating} />
                                </div>

                            </CardContent>
                        </Card>

                        <div className="p-1 rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-purple-600 shadow-xl shadow-primary/20">
                            <Button
                                size="lg"
                                className="w-full text-lg h-16 bg-background hover:bg-background/90 text-foreground border-none rounded-xl font-black group transition-all"
                                onClick={handleGenerate}
                                disabled={!isValid || isGenerating}
                            >
                                {isGenerating ? (
                                    <><Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" /> Ativando Agentes...</>
                                ) : (
                                    <><Sparkles className="mr-3 h-6 w-6 text-primary group-hover:scale-125 transition-transform" /> GERAR SUPER PAGE</>
                                )}
                            </Button>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                            <Settings2 className="h-5 w-5 mt-0.5 shrink-0" />
                            <p className="text-[11px] font-medium leading-relaxed">
                                <strong>Atenção:</strong> Super Pages consomem mais tokens e créditos de imagem devido à profundidade semântica. Tempo estimado: ~4min.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
