import { ArrowLeft, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArticleContentProps {
  title: string;
  author: string;
  content: string;
  onBack: () => void;
}

export function ArticleContent({ title, author, content, onBack }: ArticleContentProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to search
      </Button>

      <article className="article-content">
        <header className="mb-8 pb-6 border-b border-border">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
            {title}
          </h1>
          {author && (
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </header>

        <div 
          className="prose prose-lg max-w-none
            prose-headings:font-serif prose-headings:text-foreground
            prose-p:text-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic
            prose-code:bg-muted prose-code:px-1 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:border-border
            prose-img:rounded-lg prose-img:shadow-md
            prose-li:text-foreground"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>
    </div>
  );
}
