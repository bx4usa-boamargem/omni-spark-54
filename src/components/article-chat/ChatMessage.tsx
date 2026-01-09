import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 p-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      <div className={cn(
        "flex-1 max-w-[80%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted rounded-bl-md"
      )}>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
