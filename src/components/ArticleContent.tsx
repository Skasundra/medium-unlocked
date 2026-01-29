import { forwardRef } from 'react';
import { ArrowLeft, Clock, User, BookOpen, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextSizeControl, type TextSize } from './TextSizeControl';
import { ReadingProgressBar } from './ReadingProgressBar';

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

const textSizeClasses: Record<TextSize, string> = {
  sm: 'text-base leading-relaxed',
  base: 'text-lg leading-relaxed',
  lg: 'text-xl leading-relaxed',
  xl: 'text-2xl leading-loose',
};

const ArticleContent = forwardRef<HTMLDivElement, ArticleContentProps>(
  ({ title, author, content, wordCount, readingTime, textSize, onTextSizeChange, onBack, url, isBookmarked, onBookmarkToggle }, ref) => {
    return (
      <>
        <ReadingProgressBar contentRef={ref as React.RefObject<HTMLElement>} />
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onBookmarkToggle}
                className={`${
                  isBookmarked 
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
            className={`prose max-w-none
              prose-headings:font-serif prose-headings:text-foreground
              prose-p:text-foreground prose-p:${textSizeClasses[textSize]}
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground
              prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic
              prose-code:bg-muted prose-code:px-1 prose-code:rounded
              prose-pre:bg-muted prose-pre:border prose-pre:border-border
              prose-img:rounded-lg prose-img:shadow-md
              prose-li:text-foreground`}
            style={{
              fontSize: textSize === 'sm' ? '1rem' : textSize === 'base' ? '1.125rem' : textSize === 'lg' ? '1.25rem' : '1.5rem',
              lineHeight: textSize === 'xl' ? '2' : '1.75',
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </div>
    </>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';

export { ArticleContent };
