import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCircle, 
  Send, 
  Sparkles, 
  Loader2,
  Bot,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export function LandingChat() {
  const { t, i18n } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('landing.chat.welcome', "Hi! 👋 I'm OMNISEEN's AI assistant. How can I help you today? Feel free to ask about our features, pricing, or how to get started!"),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const promptSuggestions = [
    t('landing.chat.prompts.pricing', 'What are the pricing plans?'),
    t('landing.chat.prompts.features', 'What features are included?'),
    t('landing.chat.prompts.trial', 'How does the free trial work?'),
    t('landing.chat.prompts.seo', 'How does the SEO optimization work?'),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        content: data.response || t('landing.chat.error', 'Sorry, I could not process your request. Please try again.'),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('landing.chat.error', 'Sorry, I could not process your request. Please try again.'),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
            <MessageCircle className="h-4 w-4" />
            {t('landing.chat.badge', 'AI Assistant')}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.chat.title', 'Have Questions?')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.chat.subtitle', 'Chat with our AI assistant to learn more about OMNISEEN and how it can help your business.')}
          </p>
        </div>

        <div className={`max-w-2xl mx-auto transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Chat container */}
          <div className="bg-card rounded-2xl border shadow-xl overflow-hidden">
            {/* Header */}
            <div className="gradient-primary px-6 py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">
                  {t('landing.chat.header', 'OMNISEEN AI')}
                </h3>
                <p className="text-xs text-primary-foreground/70">
                  {t('landing.chat.status', 'Online • Typically replies instantly')}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-muted/20">
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
                      ? 'gradient-primary' 
                      : 'bg-secondary'
                  )}>
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === 'assistant'
                      ? 'bg-card border'
                      : 'gradient-primary text-primary-foreground'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-card border rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt suggestions */}
            <div className="px-4 py-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">
                {t('landing.chat.suggestions', 'Quick questions:')}
              </p>
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background">
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
                  placeholder={t('landing.chat.placeholder', 'Type your message...')}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
