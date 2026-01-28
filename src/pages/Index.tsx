import { useState } from 'react';
import { ArticleInput } from '@/components/ArticleInput';
import { ArticleContent } from '@/components/ArticleContent';
import { ArticleHistory } from '@/components/ArticleHistory';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useArticleHistory } from '@/hooks/useArticleHistory';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const { history, addToHistory, clearHistory, removeFromHistory } = useArticleHistory();

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {!article && !isLoading && (
          <>
            {/* Header */}
            <div className="text-center mb-10">
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
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
