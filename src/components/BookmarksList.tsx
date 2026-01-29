import { BookmarkItem } from '@/hooks/useBookmarks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark, Clock, User, Trash2, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BookmarksListProps {
  bookmarks: BookmarkItem[];
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
}

export function BookmarksList({ bookmarks, onSelect, onRemove, onClear }: BookmarksListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground text-center">
              Bookmark articles while reading to save them for later
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Bookmarked Articles ({bookmarks.length})
          </h2>
        </div>
        {bookmarks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {bookmarks.map((bookmark) => (
          <Card key={bookmark.url} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onSelect(bookmark.url)}
                    className="text-left w-full group"
                  >
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {bookmark.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {bookmark.author && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{bookmark.author}</span>
                        </div>
                      )}
                      {bookmark.readingTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{bookmark.readingTime} min read</span>
                        </div>
                      )}
                      {bookmark.wordCount && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{bookmark.wordCount.toLocaleString()} words</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Bookmark className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(bookmark.bookmarkedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(bookmark.url)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}