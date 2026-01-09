export type TemplateCategory = 'all' | 'minimal' | 'creative' | 'corporate' | 'editorial' | 'niche';
export type TemplateNiche = 'ecommerce' | 'health' | 'education' | 'tech';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  niche?: TemplateNiche;
  isPopular?: boolean;
  isNew?: boolean;
  tags: string[];
  heroStyle: 'centered' | 'split' | 'minimal' | 'asymmetric' | 'featured' | 'ticker';
  gridColumns: 1 | 2 | 3 | 4;
  gridStyle: 'uniform' | 'masonry' | 'list' | 'dense' | 'featured';
  cardStyle: 'rounded' | 'sharp' | 'minimal' | 'colorful' | 'image-heavy';
  defaultDarkMode?: boolean;
}

export interface SeasonalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  availableMonth: number; // 1-12
  effects: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Todos', count: 13 },
  { id: 'minimal', label: 'Minimalistas', count: 3 },
  { id: 'creative', label: 'Criativos', count: 3 },
  { id: 'corporate', label: 'Corporativos', count: 3 },
  { id: 'editorial', label: 'Editoriais', count: 4 },
] as const;

export const TEMPLATE_NICHES = [
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { id: 'health', label: 'Saúde', icon: '💚' },
  { id: 'education', label: 'Educação', icon: '📚' },
  { id: 'tech', label: 'Tecnologia', icon: '💻' },
] as const;

export const TEMPLATES: TemplateDefinition[] = [
  // General Templates
  {
    id: 'automarticles',
    name: 'Automarticles',
    description: 'Layout editorial premium com tipografia elegante e foco no conteúdo',
    category: 'editorial',
    isPopular: true,
    isNew: true,
    tags: ['premium', 'editorial', 'clean'],
    heroStyle: 'minimal',
    gridColumns: 1,
    gridStyle: 'list',
    cardStyle: 'minimal',
  },
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Layout limpo com hero centralizado e grid de 3 colunas',
    category: 'corporate',
    isPopular: true,
    tags: ['profissional', 'tech', 'saas'],
    heroStyle: 'centered',
    gridColumns: 3,
    gridStyle: 'uniform',
    cardStyle: 'rounded',
  },
  {
    id: 'magazine',
    name: 'Revista',
    description: 'Artigo destaque grande com grid lateral estilo editorial',
    category: 'editorial',
    isNew: true,
    tags: ['notícias', 'lifestyle', 'mídia'],
    heroStyle: 'featured',
    gridColumns: 2,
    gridStyle: 'featured',
    cardStyle: 'image-heavy',
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Foco no texto, sem distrações visuais',
    category: 'minimal',
    tags: ['escritor', 'pessoal', 'clean'],
    heroStyle: 'minimal',
    gridColumns: 1,
    gridStyle: 'list',
    cardStyle: 'minimal',
  },
  {
    id: 'creative',
    name: 'Criativo',
    description: 'Layout assimétrico com cores vibrantes e animações',
    category: 'creative',
    isPopular: true,
    tags: ['agência', 'design', 'arte'],
    heroStyle: 'asymmetric',
    gridColumns: 3,
    gridStyle: 'masonry',
    cardStyle: 'colorful',
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Profissional e formal para empresas',
    category: 'corporate',
    tags: ['empresa', 'consultoria', 'b2b'],
    heroStyle: 'centered',
    gridColumns: 3,
    gridStyle: 'uniform',
    cardStyle: 'sharp',
  },
  {
    id: 'startup',
    name: 'Startup',
    description: 'Moderno com CTA grande e visual tech',
    category: 'creative',
    isNew: true,
    tags: ['startup', 'produto', 'landing'],
    heroStyle: 'split',
    gridColumns: 2,
    gridStyle: 'uniform',
    cardStyle: 'rounded',
  },
  {
    id: 'personal',
    name: 'Pessoal',
    description: 'Focado no autor com foto centralizada',
    category: 'minimal',
    tags: ['coach', 'influencer', 'blog pessoal'],
    heroStyle: 'centered',
    gridColumns: 2,
    gridStyle: 'uniform',
    cardStyle: 'rounded',
  },
  {
    id: 'news',
    name: 'Notícias',
    description: 'Grid denso estilo portal de notícias',
    category: 'editorial',
    tags: ['jornal', 'portal', 'notícias'],
    heroStyle: 'ticker',
    gridColumns: 4,
    gridStyle: 'dense',
    cardStyle: 'sharp',
  },
  // Niche Templates
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Otimizado para lojas com badges e CTAs de compra',
    category: 'niche',
    niche: 'ecommerce',
    tags: ['loja', 'produtos', 'vendas'],
    heroStyle: 'split',
    gridColumns: 3,
    gridStyle: 'uniform',
    cardStyle: 'image-heavy',
  },
  {
    id: 'health',
    name: 'Saúde',
    description: 'Cores suaves e layout informativo para área médica',
    category: 'niche',
    niche: 'health',
    tags: ['médico', 'clínica', 'bem-estar'],
    heroStyle: 'centered',
    gridColumns: 3,
    gridStyle: 'uniform',
    cardStyle: 'rounded',
  },
  {
    id: 'education',
    name: 'Educação',
    description: 'Layout didático com categorias e ícones acadêmicos',
    category: 'niche',
    niche: 'education',
    tags: ['curso', 'escola', 'ensino'],
    heroStyle: 'centered',
    gridColumns: 3,
    gridStyle: 'uniform',
    cardStyle: 'rounded',
  },
  {
    id: 'tech',
    name: 'Tecnologia',
    description: 'Dark mode padrão com visual futurista',
    category: 'niche',
    niche: 'tech',
    defaultDarkMode: true,
    tags: ['dev', 'programação', 'software'],
    heroStyle: 'split',
    gridColumns: 2,
    gridStyle: 'uniform',
    cardStyle: 'sharp',
  },
];

export const SEASONAL_TEMPLATES: SeasonalTemplate[] = [
  {
    id: 'christmas',
    name: 'Natal',
    description: 'Neve animada, cores festivas e ícones natalinos',
    icon: '🎄',
    availableMonth: 12,
    effects: ['snowfall', 'festive-border'],
    colorScheme: {
      primary: '#c41e3a',
      secondary: '#228b22',
      accent: '#ffd700',
    },
  },
  {
    id: 'black_friday',
    name: 'Black Friday',
    description: 'Visual de urgência com badges de desconto',
    icon: '🏷️',
    availableMonth: 11,
    effects: ['countdown', 'flash-deals'],
    colorScheme: {
      primary: '#000000',
      secondary: '#ffd700',
      accent: '#ff4500',
    },
  },
  {
    id: 'new_year',
    name: 'Ano Novo',
    description: 'Fogos de artifício, dourado e confetti',
    icon: '🎆',
    availableMonth: 1,
    effects: ['confetti', 'fireworks'],
    colorScheme: {
      primary: '#1a1a2e',
      secondary: '#ffd700',
      accent: '#c0c0c0',
    },
  },
];

export const getTemplateById = (id: string): TemplateDefinition | undefined => {
  return TEMPLATES.find(t => t.id === id);
};

export const getSeasonalTemplateById = (id: string): SeasonalTemplate | undefined => {
  return SEASONAL_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: TemplateCategory): TemplateDefinition[] => {
  if (category === 'all') return TEMPLATES;
  return TEMPLATES.filter(t => t.category === category);
};

export const getTemplatesByNiche = (niche: TemplateNiche): TemplateDefinition[] => {
  return TEMPLATES.filter(t => t.niche === niche);
};

export const isSeasonalAvailable = (template: SeasonalTemplate): boolean => {
  const currentMonth = new Date().getMonth() + 1;
  return template.availableMonth === currentMonth;
};
