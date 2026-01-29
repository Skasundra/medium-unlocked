import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArticleInput } from '@/components/ArticleInput';
import { ArticleContent } from '@/components/ArticleContent';
import { ArticleHistory } from '@/components/ArticleHistory';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useArticleHistory } from '@/hooks/useArticleHistory';
import { supabase } from '@/lib/supabaseClient';
import { BookOpen, AlertCircle, BarChart3, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { TextSize } from '@/components/TextSizeControl';

interface Article {
  title: string;
  author: string;
  content: string;
  wordCount?: number;
  readingTime?: number;
}

const Index = () => {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<TextSize>(() => {
    const saved = localStorage.getItem('textSize');
    return (saved as TextSize) || 'base';
  });
  const { history, addToHistory, clearHistory, removeFromHistory } = useArticleHistory();

  useEffect(() => {
    localStorage.setItem('textSize', textSize);
  }, [textSize]);

  const fetchArticle = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setArticle(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-article', {
        body: { url },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch article');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setArticle(data);
      addToHistory({
        url,
        title: data.title,
        author: data.author,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setArticle(null);
    setError(null);
  };

  const handleResumeLastArticle = () => {
    if (history.length > 0) {
      fetchArticle(history[0].url);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {!article && !isLoading && (
          <>
            {/* Header */}
            <div className="text-center mb-10 relative">
              <div className="absolute top-0 right-0 flex items-center gap-2">
                <ThemeToggle />
                <Link to="/analytics">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
              </div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4">
                Medium Reader
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Read Medium articles without a subscription. Just paste the URL and enjoy distraction-free reading.
              </p>
            </div>

            {/* Input */}
            <ArticleInput onSubmit={fetchArticle} isLoading={isLoading} />

            {/* Resume Last Article Button */}
            {history.length > 0 && (
              <div className="max-w-2xl mx-auto mt-4 flex justify-center">
                <Button
                  variant="ghost"
                  onClick={handleResumeLastArticle}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resume: {history[0].title.length > 40 
                    ? history[0].title.substring(0, 40) + '...' 
                    : history[0].title}
                </Button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="max-w-2xl mx-auto mt-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* History */}
            <ArticleHistory
              history={history}
              onSelect={fetchArticle}
              onRemove={removeFromHistory}
              onClear={clearHistory}
            />
          </>
        )}

        {/* Loading */}
        {isLoading && <LoadingSkeleton />}

        {/* Article */}
        {article && !isLoading && (
          <ArticleContent
            title={article.title}
            author={article.author}
            content={article.content}
            wordCount={article.wordCount}
            readingTime={article.readingTime}
            textSize={textSize}
            onTextSizeChange={setTextSize}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
