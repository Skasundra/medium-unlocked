import { Clock, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleHistoryItem } from '@/hooks/useArticleHistory';
import { formatDistanceToNow } from 'date-fns';

interface ArticleHistoryProps {
  history: ArticleHistoryItem[];
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
}

export function ArticleHistory({ history, onSelect, onRemove, onClear }: ArticleHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Articles
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-destructive text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      </div>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.url}
            className="group flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onSelect(item.url)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.author && `${item.author} • `}
                {formatDistanceToNow(new Date(item.fetchedAt), { addSuffix: true })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.url);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
