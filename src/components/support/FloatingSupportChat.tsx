import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Bot,
  User,
  Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Contextual quick questions based on route (updated for /client/* routes)
const getContextualQuestions = (pathname: string, t: (key: string) => string) => {
  // New /client/* routes
  const clientQuestions: Record<string, string[]> = {
    '/client/dashboard': [
      'Como usar o Radar de Oportunidades?',
      'Como ativar a automação?',
      'Onde vejo meus resultados?',
    ],
    '/client/results': [
      'O que significa Aproveitamento do Radar?',
      'Como interpretar o ROI?',
      'Como conectar o Google Search Console?',
    ],
    '/client/radar': [
      'Como criar artigo a partir do Radar?',
      'O que significa o score de relevância?',
      'Com que frequência o Radar atualiza?',
    ],
    '/client/seo': [
      'Como melhorar meu score de SEO?',
      'O que são as otimizações sugeridas?',
      'Como corrigir meta descriptions?',
    ],
    '/client/articles': [
      'Como publicar um artigo?',
      'Como agendar publicação?',
      'Como regenerar imagens?',
    ],
    '/client/portal': [
      'Como personalizar meu blog?',
      'Como adicionar meu logo?',
      'Como mudar as cores?',
    ],
    '/client/automation': [
      'Como funciona a automação?',
      'O que é o Autopilot de Funil?',
      'Como ver a fila de produção?',
    ],
    '/client/territories': [
      'O que são territórios?',
      'Como adicionar uma região?',
      'Como funciona a análise por região?',
    ],
    '/client/company': [
      'O que devo preencher no perfil?',
      'Como configurar a economia do negócio?',
      'Como mudar o slug do blog?',
    ],
    '/client/account': [
      'Como convidar minha equipe?',
      'Como conectar meu domínio?',
      'Como mudar minha foto?',
    ],
    '/client/help': [
      'Como começar na plataforma?',
      'Quais são as funcionalidades principais?',
      'Como falar com suporte humano?',
    ],
  };

  // Legacy /app/* routes
  const legacyQuestions: Record<string, string[]> = {
    '/app/dashboard': [
      t('supportChat.questions.howToCreateArticle'),
      t('supportChat.questions.howToUseAutomation'),
      t('supportChat.questions.whereToSeeMetrics'),
    ],
    '/app/articles': [
      t('supportChat.questions.howToEditArticle'),
      t('supportChat.questions.howToPublish'),
      t('supportChat.questions.howToSchedule'),
    ],
  };

  // Check /client/* routes first
  for (const [route, questions] of Object.entries(clientQuestions)) {
    if (pathname.startsWith(route)) {
      return questions;
    }
  }

  // Check legacy /app/* routes
  for (const [route, questions] of Object.entries(legacyQuestions)) {
    if (pathname.startsWith(route)) {
      return questions;
    }
  }

  // Default questions
  return [
    'Como criar meu primeiro artigo?',
    'O que é o Radar de Oportunidades?',
    'Como ver meus resultados?',
  ];
};

export function FloatingSupportChat() {
  const location = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const getWelcomeMessage = () => t('supportChat.welcomeMessage');
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: getWelcomeMessage()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Memoize contextual questions based on route
  const quickQuestions = useMemo(
    () => getContextualQuestions(location.pathname, t),
    [location.pathname, t]
  );

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('support-chat', {
        body: {
          messages: newMessages.slice(-10), // Last 10 messages for context
          currentPage: location.pathname
        }
      });

      if (response.error) throw new Error(response.error.message);

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message 
      }]);
    } catch (error) {
      console.error('Support chat error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a mensagem."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 left-6 md:right-6 md:left-auto z-[9999] h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 z-[9999] w-auto md:w-[380px] h-[70vh] md:h-[500px] max-h-[500px] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      <CardHeader className="flex-shrink-0 p-4 border-b flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          OMNISEEN Assistant
        </CardTitle>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => {
              setIsOpen(false);
              setMessages([{
                role: 'assistant',
                content: getWelcomeMessage()
              }]);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index}
                className={cn(
                  "flex gap-2",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {message.role === 'user' ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>
                
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-br-md" 
                    : "bg-muted rounded-bl-md"
                )}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                  <p className="text-sm text-muted-foreground">{t('supportChat.typing')}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick questions for initial state */}
        {messages.length === 1 && (
          <div className="px-4 py-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">{t('supportChat.quickQuestionsLabel')}</p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setInput(question);
                  }}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('supportChat.inputPlaceholder')}
              disabled={isLoading}
              className="flex-1 h-9 text-sm"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-9 w-9"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
