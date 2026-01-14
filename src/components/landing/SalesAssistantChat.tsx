import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, 
  Loader2,
  Bot,
  User,
  X,
  Minimize2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoOmniseen from "@/assets/logo-omniseen.png";

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export function SalesAssistantChat() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestionBubble, setShowSuggestionBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! 👋 Antes de falar sobre a plataforma, me conta: qual é o seu negócio e onde você atua?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Show suggestion bubble after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowSuggestionBubble(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Hide bubble when chat opens
  useEffect(() => {
    if (isOpen) {
      setShowSuggestionBubble(false);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const salesPromptSuggestions = [
    "Quero mais clientes na minha cidade",
    "Como a Omniseen pode me ajudar?",
    "Quanto custa e qual o retorno?",
    "Funciona para meu tipo de negócio?",
  ];

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('landing-chat', {
        body: { 
          message: messageText,
          language: i18n.language,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua solicitação. Tente novamente.',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, houve um erro. Tente novamente ou acesse nosso teste grátis diretamente!',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Closed state - floating button with Omniseen icon
  if (!isOpen) {
    return (
      <>
        {/* Proactive suggestion bubble */}
        {showSuggestionBubble && (
          <div 
            className="fixed bottom-24 right-4 z-[9998] animate-in fade-in slide-in-from-bottom-2 duration-500"
            onClick={() => {
              setIsOpen(true);
              setShowSuggestionBubble(false);
            }}
          >
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl shadow-xl p-4 max-w-[280px] text-white cursor-pointer hover:scale-105 transition-transform">
              <p className="text-sm font-medium">
                🚀 Quer descobrir quantos clientes você pode atrair na sua região?
              </p>
              <p className="text-xs mt-1 opacity-80">
                Fale comigo, vou te mostrar!
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-gradient-to-br from-purple-600 to-purple-800 rotate-45" />
            </div>
          </div>
        )}

        {/* Main floating button */}
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 hover:scale-110 p-0 border-2 border-white/20"
        >
          <div className="relative">
            <Sparkles className="h-7 w-7 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
        </Button>
      </>
    );
  }

  // Open state - full chat interface
  return (
    <Card className="fixed bottom-4 right-4 left-4 md:left-auto md:right-6 z-[9999] w-auto md:w-[400px] h-[85vh] md:h-[550px] max-h-[600px] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
      {/* Header with gradient */}
      <CardHeader className="flex-shrink-0 p-0">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base font-semibold">
                Assistente de Vendas
              </CardTitle>
              <p className="text-xs text-white/70">
                Online • Responde na hora
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => {
                setIsOpen(false);
                setMessages([{
                  id: '1',
                  role: 'assistant',
                  content: 'Olá! 👋 Antes de falar sobre a plataforma, me conta: qual é o seu negócio e onde você atua?',
                }]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.role === 'assistant' 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                    : 'bg-secondary'
                )}>
                  {message.role === 'assistant' ? (
                    <Bot className="h-4 w-4 text-white" />
                  ) : (
                    <User className="h-4 w-4 text-secondary-foreground" />
                  )}
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === 'assistant'
                    ? 'bg-muted rounded-bl-md'
                    : 'bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-br-md'
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-sm text-muted-foreground">Digitando...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick questions for initial state */}
        {messages.length <= 2 && (
          <div className="px-4 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Perguntas rápidas:</p>
            <div className="flex flex-wrap gap-1.5">
              {salesPromptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA Banner */}
        <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-orange-50 dark:from-purple-900/20 dark:to-orange-900/20 border-t">
          <a 
            href="#pricing"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between text-xs font-medium text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200"
          >
            <span>🎁 Teste grátis 7 dias - Sem cartão</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-background">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1 h-10 text-base md:text-sm"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
