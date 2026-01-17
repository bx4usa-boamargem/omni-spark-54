import { MessageCircle } from "lucide-react";
import { useGlobalWhatsApp } from "@/hooks/useGlobalWhatsApp";

interface WhatsAppFloatButtonProps {
  phoneNumber: string;
  companyName?: string;
  service?: string;
  city?: string;
  articleTitle?: string;
  /** @deprecated Use o sistema global de templates */
  message?: string;
}

export function WhatsAppFloatButton({ 
  phoneNumber,
  companyName,
  service,
  city,
  articleTitle
}: WhatsAppFloatButtonProps) {
  const { buildLink } = useGlobalWhatsApp();
  
  const href = buildLink({
    phone: phoneNumber,
    companyName,
    service,
    city,
    articleTitle
  });
  
  if (href === '#') return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <div className="relative">
        {/* Pulse effect */}
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30" />
        
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center gap-2 bg-green-500 hover:bg-green-600 
            text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl 
            transition-all duration-300 group-hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="font-medium hidden md:inline">WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
