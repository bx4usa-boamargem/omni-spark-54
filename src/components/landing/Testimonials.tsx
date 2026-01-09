import { useTranslation } from 'react-i18next';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Marina Santos',
    role: 'CEO, TechStart',
    city: 'São Paulo',
    avatar: 'MS',
    color: '#6366f1',
    rating: 5,
    text: 'O OMNISEEN revolucionou nossa estratégia de conteúdo. Conseguimos aumentar o tráfego orgânico em 300% em apenas 3 meses.',
    textEn: 'OMNISEEN revolutionized our content strategy. We managed to increase organic traffic by 300% in just 3 months.'
  },
  {
    name: 'Ricardo Mendes',
    role: 'Consultor de Marketing',
    city: 'Rio de Janeiro',
    avatar: 'RM',
    color: '#22c55e',
    rating: 5,
    text: 'Finalmente uma ferramenta que entende o que significa criar conteúdo de qualidade. A IA é impressionantemente precisa.',
    textEn: 'Finally a tool that understands what it means to create quality content. The AI is impressively accurate.'
  },
  {
    name: 'Ana Costa',
    role: 'Nutricionista',
    city: 'Curitiba',
    avatar: 'AC',
    color: '#ec4899',
    rating: 5,
    text: 'Como profissional autônoma, não tinha tempo para criar conteúdo. Agora publico artigos semanais sem esforço.',
    textEn: 'As a freelance professional, I had no time to create content. Now I publish weekly articles effortlessly.'
  },
  {
    name: 'Pedro Lima',
    role: 'Founder, SaaSBox',
    city: 'Belo Horizonte',
    avatar: 'PL',
    color: '#f59e0b',
    rating: 5,
    text: 'A qualidade do SEO automático é surpreendente. Nossos artigos estão ranqueando na primeira página do Google.',
    textEn: 'The quality of automatic SEO is amazing. Our articles are ranking on Google\'s first page.'
  },
  {
    name: 'Juliana Alves',
    role: 'Content Manager',
    city: 'Porto Alegre',
    avatar: 'JA',
    color: '#0ea5e9',
    rating: 5,
    text: 'Gerencio 5 blogs diferentes com facilidade. A automação economiza horas do meu dia que posso usar para estratégia.',
    textEn: 'I manage 5 different blogs with ease. Automation saves hours of my day that I can use for strategy.'
  },
  {
    name: 'Carlos Ferreira',
    role: 'Agência Digital',
    city: 'Recife',
    avatar: 'CF',
    color: '#ef4444',
    rating: 5,
    text: 'Meus clientes ficam impressionados com a velocidade de entrega. O white label é perfeito para agências.',
    textEn: 'My clients are impressed with the delivery speed. White label is perfect for agencies.'
  }
];

export const Testimonials = () => {
  const { t, i18n } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);
  const isEnglish = i18n.language === 'en';

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.testimonials.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.testimonials.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={`bg-card rounded-2xl border p-6 relative transition-all duration-500 hover:shadow-lg ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-muted/30" />
              
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: testimonial.color }}
                >
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.city}
                  </div>
                </div>
              </div>

              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>

              <p className="text-muted-foreground leading-relaxed">
                "{isEnglish ? testimonial.textEn : testimonial.text}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
