import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactInfo } from "../types/landingPageTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactFormBlockProps {
  contact: ContactInfo;
  blogId: string;
  services?: string[];
  primaryColor?: string;
  onEdit?: (field: keyof ContactInfo, value: string) => void;
  isEditing?: boolean;
}

export function ContactFormBlock({ 
  contact,
  blogId,
  services = [],
  primaryColor,
  onEdit,
  isEditing = false 
}: ContactFormBlockProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error("Por favor, preencha nome e telefone");
      return;
    }

    setIsSubmitting(true);

    try {
      // Register as a lead
      const { error } = await supabase.from('real_leads').insert({
        blog_id: blogId,
        lead_type: 'form_submit',
        source_url: window.location.href,
        metadata: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          service: formData.service,
          message: formData.message,
          source: 'landing_page_contact_form'
        }
      });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso! Entraremos em contato em breve.");
      setFormData({ name: '', phone: '', email: '', service: '', message: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 px-4 bg-muted/30" id="contato">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Entre em Contato
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Solicite um orçamento gratuito e sem compromisso
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Solicite um Orçamento Grátis
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1.5"
                />
              </div>

              {services.length > 0 && (
                <div>
                  <Label htmlFor="service">Serviço Desejado</Label>
                  <Select
                    value={formData.service}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service, index) => (
                        <SelectItem key={index} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva sua necessidade..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="mt-1.5 min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full font-semibold"
                style={{ 
                  backgroundColor: primaryColor || undefined,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Informações de Contato
              </h3>

              <div className="space-y-5">
                {/* Address */}
                {contact.address && (
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                    >
                      <MapPin 
                        className="w-6 h-6" 
                        style={{ color: primaryColor || 'hsl(var(--primary))' }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Endereço</p>
                      <p className="text-muted-foreground">{contact.address}</p>
                    </div>
                  </div>
                )}

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                  >
                    <Phone 
                      className="w-6 h-6" 
                      style={{ color: primaryColor || 'hsl(var(--primary))' }}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Telefone</p>
                    <a 
                      href={`tel:${contact.phone.replace(/\D/g, '')}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>

                {/* Email */}
                {contact.email && (
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                    >
                      <Mail 
                        className="w-6 h-6" 
                        style={{ color: primaryColor || 'hsl(var(--primary))' }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">E-mail</p>
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Hours */}
                {contact.hours && (
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                    >
                      <Clock 
                        className="w-6 h-6" 
                        style={{ color: primaryColor || 'hsl(var(--primary))' }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Horário</p>
                      <p className="text-muted-foreground whitespace-pre-line">{contact.hours}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency CTA */}
            <div 
              className="rounded-xl p-6 text-white text-center"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor || 'hsl(var(--primary))'} 0%, hsl(var(--primary)/0.8) 100%)`
              }}
            >
              <p className="font-medium mb-2">Atendimento de Emergência?</p>
              <p className="text-white/90 mb-4">Ligue agora e fale com nossa equipe</p>
              <a
                href={`tel:${contact.phone.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-lg hover:bg-white/90 transition-colors"
              >
                <Phone className="w-5 h-5" />
                {contact.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
