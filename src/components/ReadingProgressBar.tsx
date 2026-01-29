import { RefObject } from 'react';
import { useReadingProgress } from '@/hooks/useReadingProgress';

interface ReadingProgressBarProps {
  contentRef: RefObject<HTMLElement>;
}

export function ReadingProgressBar({ contentRef }: ReadingProgressBarProps) {
  const progress = useReadingProgress(contentRef);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
      <div 
        className="h-full bg-primary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}