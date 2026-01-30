import { X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SummaryPanelProps {
  summary: string[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function SummaryPanel({ summary, isLoading, error, onClose }: SummaryPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Summary</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-sm">Generating summary...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && summary.length > 0 && (
          <ul className="space-y-4">
            {summary.map((point, index) => (
              <li
                key={index}
                className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-foreground text-sm leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !error && summary.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Click the summary button to generate key points</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
