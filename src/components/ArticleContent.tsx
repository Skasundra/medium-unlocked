import { forwardRef, useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, BookOpen, Bookmark, BookmarkCheck, Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextSizeControl, type TextSize } from './TextSizeControl';
import { ReadingProgressBar } from './ReadingProgressBar';
import { SummaryPanel } from './SummaryPanel';
import { useArticleSummary } from '@/hooks/useArticleSummary';

interface ArticleContentProps {
  title: string;
  author: string;
  content: string;
  wordCount?: number;
  readingTime?: number;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
  onBack: () => void;
  url: string;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
}

const ArticleContent = forwardRef<HTMLDivElement, ArticleContentProps>(
  ({ title, author, content, wordCount, readingTime, textSize, onTextSizeChange, onBack, url, isBookmarked, onBookmarkToggle }, ref) => {
    const [showSummary, setShowSummary] = useState(false);
    const { summary, isLoading: isSummaryLoading, error: summaryError, generateSummary, clearSummary } = useArticleSummary();

    const handleSummaryToggle = () => {
      if (!showSummary) {
        setShowSummary(true);
        if (summary.length === 0 && !isSummaryLoading) {
          generateSummary(content, title);
        }
      } else {
        setShowSummary(false);
      }
    };

    const handleCloseSummary = () => {
      setShowSummary(false);
    };

    // Reset summary when article changes
    useEffect(() => {
      clearSummary();
      setShowSummary(false);
    }, [url, clearSummary]);

    return (
      <>
        <ReadingProgressBar contentRef={ref as React.RefObject<HTMLElement>} />
        <div className="flex w-full">
          {/* Main Article Content */}
          <div 
            className={`transition-all duration-300 ease-in-out ${
              showSummary ? 'w-full lg:w-3/5' : 'w-full'
            }`}
          >
            <div ref={ref} className="w-full max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to search
                </Button>

                <div className="flex items-center gap-2">
                  {/* AI Summary Toggle Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSummaryToggle}
                    className={`${
                      showSummary
                        ? 'text-primary hover:text-primary/80 bg-primary/10'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                    title={showSummary ? 'Hide AI Summary' : 'Show AI Summary'}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline text-xs">Summary</span>
                    {showSummary ? (
                      <PanelRightClose className="h-4 w-4 ml-1" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4 ml-1" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBookmarkToggle}
                    className={`${isBookmarked
                        ? 'text-primary hover:text-primary/80'
                        : 'text-muted-foreground hover:text-primary'
                      }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                  <TextSizeControl size={textSize} onSizeChange={onTextSizeChange} />
                </div>
              </div>

              <article className="article-content">
                <header className="mb-8 pb-6 border-b border-border">
                  <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
                    {title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    {author && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{author}</span>
                      </div>
                    )}
                    {readingTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{readingTime} min read</span>
                      </div>
                    )}
                    {wordCount && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{wordCount.toLocaleString()} words</span>
                      </div>
                    )}
                  </div>
                </header>

                <div
                  className={`article-content-body prose max-w-none
                  prose-headings:font-serif prose-headings:text-foreground
                  prose-p:text-foreground
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-foreground
                  prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic
                  prose-code:bg-muted prose-code:px-1 prose-code:rounded
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border
                  prose-img:rounded-lg prose-img:shadow-md
                  prose-li:text-foreground`}
                  data-text-size={textSize}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </article>
            </div>
          </div>

          {/* Summary Panel */}
          <div 
            className={`fixed top-0 right-0 h-full bg-background shadow-xl transition-all duration-300 ease-in-out z-50 ${
              showSummary ? 'w-full sm:w-96 translate-x-0' : 'w-0 translate-x-full'
            } overflow-hidden`}
          >
            {showSummary && (
              <SummaryPanel
                summary={summary}
                isLoading={isSummaryLoading}
                error={summaryError}
                onClose={handleCloseSummary}
              />
            )}
          </div>
        </div>
      </>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';

export { ArticleContent };
