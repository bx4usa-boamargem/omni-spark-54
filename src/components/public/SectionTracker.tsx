import { useEffect, useRef, useCallback } from "react";

interface SectionData {
  id: string;
  title: string;
  index: number;
  startTime: number | null;
  totalTime: number;
}

interface SectionTrackerProps {
  articleId: string;
  blogId: string;
  sessionId: string;
  visitorId: string;
}

export const SectionTracker = ({ articleId, blogId, sessionId, visitorId }: SectionTrackerProps) => {
  const sectionsRef = useRef<Map<string, SectionData>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sendSectionEvent = useCallback(async (sectionData: SectionData) => {
    if (sectionData.totalTime < 1000) return; // Min 1 second

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "section_view",
          articleId,
          blogId,
          sessionId,
          visitorId,
          data: {
            sectionId: sectionData.id,
            sectionTitle: sectionData.title,
            sectionIndex: sectionData.index,
            timeInView: Math.round(sectionData.totalTime / 1000),
          },
        }),
      });
    } catch (error) {
      console.error("Error tracking section:", error);
    }
  }, [articleId, blogId, sessionId, visitorId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const sections = sectionsRef.current;
      const now = Date.now();

      sections.forEach((section) => {
        if (section.startTime !== null) {
          section.totalTime += now - section.startTime;
          section.startTime = document.hidden ? null : now;
        }
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll("article h2[id]");
    const sectionMap = sectionsRef.current;

    sections.forEach((section, index) => {
      const id = section.id;
      const title = section.textContent || "";
      
      if (!sectionMap.has(id)) {
        sectionMap.set(id, {
          id,
          title,
          index,
          startTime: null,
          totalTime: 0,
        });
      }
    });

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const now = Date.now();

        entries.forEach((entry) => {
          const sectionData = sectionMap.get(entry.target.id);
          if (!sectionData) return;

          if (entry.isIntersecting) {
            sectionData.startTime = now;
          } else if (sectionData.startTime !== null) {
            sectionData.totalTime += now - sectionData.startTime;
            sectionData.startTime = null;
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((section) => {
      observerRef.current?.observe(section);
    });

    return () => {
      observerRef.current?.disconnect();

      // Send all section data on unmount
      const now = Date.now();
      sectionMap.forEach((section) => {
        if (section.startTime !== null) {
          section.totalTime += now - section.startTime;
        }
        sendSectionEvent(section);
      });
    };
  }, [sendSectionEvent]);

  return null;
};
