import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clipboard, ArrowRight, Loader2 } from 'lucide-react';
import { useAdsterraPopunder } from '@/hooks/useAdsterraPopunder';

interface ArticleInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function ArticleInput({ onSubmit, isLoading }: ArticleInputProps) {
  const [url, setUrl] = useState('');
  const { triggerPopunder } = useAdsterraPopunder();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (error) {
      console.error('Failed to read clipboard');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      // Trigger popunder on form submission
      triggerPopunder();
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            type="url"
            placeholder="Paste a Medium article URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pr-12 h-12 text-base bg-card border-border focus:border-primary"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            title="Paste from clipboard"
          >
            <Clipboard className="h-5 w-5" />
          </button>
        </div>
        <Button 
          type="submit" 
          disabled={!url.trim() || isLoading}
          className="h-12 px-6 font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              Read Article
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
