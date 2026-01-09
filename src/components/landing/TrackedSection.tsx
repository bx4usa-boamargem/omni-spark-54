import { useEffect, useRef } from 'react';
import { useLandingTrackingContext } from '@/hooks/useLandingTracking';

interface TrackedSectionProps {
  sectionId: string;
  children: React.ReactNode;
  className?: string;
}

export function TrackedSection({ sectionId, children, className }: TrackedSectionProps) {
  const tracking = useLandingTrackingContext();
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!tracking || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            tracking.trackSectionView(sectionId);
            hasTracked.current = true;
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, [tracking, sectionId]);

  return (
    <div ref={sectionRef} className={className}>
      {children}
    </div>
  );
}
