import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppFloatProps {
  phoneNumber?: string;
  message?: string;
  className?: string;
}

export function WhatsAppFloat({ 
  phoneNumber = "5511999999999", // Replace with actual number
  message,
  className 
}: WhatsAppFloatProps) {
  const { t } = useTranslation();
  
  const defaultMessage = t('landing.whatsapp.message', 'Hi! I want to know more about OMNISEEN');
  const encodedMessage = encodeURIComponent(message || defaultMessage);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-6 z-50 group",
        className
      )}
    >
      <div className="relative">
        {/* Pulse effect */}
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30" />
        
        {/* Button */}
        <div className="relative flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
          <MessageCircle className="h-6 w-6" />
          <span className="font-medium hidden sm:inline pr-1">
            {t('landing.whatsapp.label', 'Talk to us')}
          </span>
        </div>
      </div>
    </a>
  );
}
