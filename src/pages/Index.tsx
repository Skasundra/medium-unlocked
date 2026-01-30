import { useState, useEffect, useRef } from 'react';
import { ArticleInput } from '@/components/ArticleInput';
import { ArticleContent } from '@/components/ArticleContent';
import { ArticleHistory } from '@/components/ArticleHistory';
import { BookmarksList } from '@/components/BookmarksList';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useArticleHistory } from '@/hooks/useArticleHistory';
import { useBookmarks } from '@/hooks/useBookmarks';
import { ArticleFetcher } from '@/services/articleFetcher';
import { BookOpen, AlertCircle, RotateCcw, Bookmark, History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TextSize } from '@/components/TextSizeControl';

interface Article {
  title: string;
  author: string;
  content: string;
  wordCount?: number;
  readingTime?: number;
  warning?: string;
  url: string;
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
  const { bookmarks, addBookmark, removeBookmark, isBookmarked, clearBookmarks } = useBookmarks();
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('textSize', textSize);
  }, [textSize]);

  const fetchArticle = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setArticle(null);

    try {
      const data = await ArticleFetcher.fetchArticle(url);

      const articleData = { ...data, url };
      setArticle(articleData);
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

  const handleArticleSelect = (url: string) => {
    // Trigger popunder when selecting from history or bookmarks
    fetchArticle(url);
  };

  const handleBookmarkToggle = () => {
    if (!article) return;

    if (isBookmarked(article.url)) {
      removeBookmark(article.url);
    } else {
      addBookmark({
        url: article.url,
        title: article.title,
        author: article.author,
        wordCount: article.wordCount,
        readingTime: article.readingTime,
      });
    }
  };

  const handleBack = () => {
    setArticle(null);
    setError(null);
  };

  const handleResumeLastArticle = () => {
    if (history.length > 0) {
      // Trigger popunder when resuming last article
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

            {/* History and Bookmarks */}
            <Tabs defaultValue="history" className="max-w-2xl mx-auto mt-12">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent ({history.length})
                </TabsTrigger>
                <TabsTrigger value="bookmarks" className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  Bookmarks ({bookmarks.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="history" className="mt-6">
                <ArticleHistory
                  history={history}
                  onSelect={handleArticleSelect}
                  onRemove={removeFromHistory}
                  onClear={clearHistory}
                />
              </TabsContent>
              <TabsContent value="bookmarks" className="mt-6">
                <BookmarksList
                  bookmarks={bookmarks}
                  onSelect={handleArticleSelect}
                  onRemove={removeBookmark}
                  onClear={clearBookmarks}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Loading */}
        {isLoading && <LoadingSkeleton />}

        {/* Article */}
        {article && !isLoading && (
          <>
            {/* Warning for partial content */}
            {article.warning && (
              <div className="max-w-3xl mx-auto mb-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{article.warning}</AlertDescription>
                </Alert>
              </div>
            )}

            <ArticleContent
              ref={articleRef}
              title={article.title}
              author={article.author}
              content={article.content}
              wordCount={article.wordCount}
              readingTime={article.readingTime}
              textSize={textSize}
              onTextSizeChange={setTextSize}
              onBack={handleBack}
              url={article.url}
              isBookmarked={isBookmarked(article.url)}
              onBookmarkToggle={handleBookmarkToggle}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
