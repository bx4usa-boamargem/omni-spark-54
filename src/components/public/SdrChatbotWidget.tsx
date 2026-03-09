import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
    role: 'bot' | 'user';
    content: string;
}

interface SdrChatbotWidgetProps {
    articleId?: string;
    articleTitle?: string;
    articleContent?: string;
    clientLogo?: string;
    clientName?: string;
    pageType?: 'article' | 'super_page';
}

export function SdrChatbotWidget({
    articleId,
    articleTitle,
    clientLogo,
    clientName = "Especialista",
    pageType = 'article'
}: SdrChatbotWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Proactive trigger logic
    useEffect(() => {
        if (hasInteracted) return;

        if (pageType === 'super_page') {
            const timer = setTimeout(() => {
                setIsOpen(true);
                triggerInitialGreeting();
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            const handleScroll = () => {
                const scrollPosition = window.scrollY;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollPercentage = (scrollPosition / (documentHeight - windowHeight)) * 100;

                if (scrollPercentage >= 50 && !isOpen && !hasInteracted) {
                    setIsOpen(true);
                    triggerInitialGreeting();
                    window.removeEventListener('scroll', handleScroll);
                }
            };
            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, [pageType, hasInteracted, isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const triggerInitialGreeting = () => {
        setHasInteracted(true);
        let greeting = `Olá! Como posso ajudar você hoje?`;

        if (pageType === 'article' && articleTitle) {
            greeting = `Olá! Vi que você está lendo sobre "${articleTitle}". Ficou com alguma dúvida ou quer saber como isso se aplica ao seu caso?`;
        } else if (pageType === 'super_page') {
            greeting = `Olá! Sou o assistente virtual da ${clientName}. Como posso ajudar a resolver seu problema hoje? Se quiser um orçamento rápido, é só falar!`;
        }

        setMessages([{ role: 'bot', content: greeting }]);
    };

    const handleToggle = () => {
        if (!isOpen && !hasInteracted) {
            triggerInitialGreeting();
        }
        setIsOpen(!isOpen);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = inputValue.trim();
        setInputValue('');

        const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setIsTyping(true);

        try {
            const { data, error } = await supabase.functions.invoke('chat-sdr', {
                body: {
                    messages: newMessages.map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content })),
                    articleId,
                    articleTitle
                }
            });

            if (error) throw error;

            if (data?.reply) {
                setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
            } else {
                throw new Error('No reply from SDR');
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'bot',
                content: 'Desculpe, ocorreu um pequeno problema de conexão. Poderia me confirmar seu WhatsApp para que um especialista te chame direto por lá?'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <div
                className={cn(
                    "transition-all duration-300 ease-in-out origin-bottom-right mb-4",
                    isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
                )}
            >
                <Card className="w-[350px] shadow-2xl border-primary/20 flex flex-col h-[450px] overflow-hidden">
                    <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center overflow-hidden border-2 border-primary-foreground/30">
                                {clientLogo ? (
                                    <img src={clientLogo} alt={clientName} className="w-full h-full object-cover" />
                                ) : (
                                    <Bot className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-none">{clientName}</h3>
                                <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                    Online agora
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-muted border rounded-tl-none text-foreground"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-muted border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
                                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-background border-t">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={!inputValue.trim() || isTyping}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>

            <button
                onClick={handleToggle}
                className={cn(
                    "h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95",
                    isOpen ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                )}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!isOpen && hasInteracted && messages.length > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-background rounded-full"></span>
                )}
            </button>
        </div>
    );
}
