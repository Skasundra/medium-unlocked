import { useState, useEffect, RefObject } from 'react';

export function useReadingProgress(contentRef: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const documentHeight = element.scrollHeight;
      
      // Calculate how much of the content is above the viewport
      const scrollTop = Math.max(0, -rect.top);
      
      // Calculate the visible height of the content
      const visibleHeight = Math.min(documentHeight, windowHeight - Math.max(0, rect.top));
      
      // Calculate progress as percentage
      const totalScrollableHeight = documentHeight - visibleHeight;
      const progressPercentage = totalScrollableHeight > 0 
        ? Math.min(100, Math.max(0, (scrollTop / totalScrollableHeight) * 100))
        : 0;

      setProgress(progressPercentage);
    };

    const handleScroll = () => {
      requestAnimationFrame(updateProgress);
    };

    // Initial calculation
    updateProgress();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateProgress);
    };
  }, [contentRef]);

  return progress;
}