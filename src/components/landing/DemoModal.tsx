import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, LayoutDashboard, Wand2, Search, Palette, BarChart3, Send } from 'lucide-react';

const slideIcons = [
  LayoutDashboard,
  Wand2,
  Search,
  Palette,
  BarChart3,
  Send
];

const slideKeys = [
  'dashboard',
  'aiGeneration',
  'seoOptimization',
  'customization',
  'analytics',
  'publishing'
];

const slideImages = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=450&fit=crop'
];

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrevious = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : slideKeys.length - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev < slideKeys.length - 1 ? prev + 1 : 0));
  };

  const CurrentIcon = slideIcons[currentSlide];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-display">
              {t('landing.demo.title')}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Slide Content */}
          <div className="relative">
            <div className="relative rounded-xl overflow-hidden aspect-video bg-muted">
              <img
                src={slideImages[currentSlide]}
                alt={t(`landing.demo.slides.${slideKeys[currentSlide]}.title`)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                    <CurrentIcon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {t(`landing.demo.slides.${slideKeys[currentSlide]}.title`)}
                  </h3>
                </div>
                <p className="text-white/80">
                  {t(`landing.demo.slides.${slideKeys[currentSlide]}.description`)}
                </p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Slide Indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {slideKeys.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'w-8 bg-primary' 
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t('landing.demo.previous')}
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slideKeys.length}
            </span>

            <Button onClick={handleNext}>
              {t('landing.demo.next')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
