import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, BarChart3, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArticleHistory } from '@/hooks/useArticleHistory';

const Analytics = () => {
  const { history } = useArticleHistory();

  const stats = {
    totalArticles: history.length,
    uniqueAuthors: new Set(history.map(h => h.author).filter(Boolean)).size,
    recentArticles: history.slice(0, 5),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reader
            </Button>
          </Link>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Reading History
          </h1>
          <p className="text-muted-foreground">
            Your local reading statistics (stored in browser)
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            All data is stored locally in your browser. No server-side analytics are collected.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Articles Read
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalArticles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Authors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.uniqueAuthors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                History Limit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">20</div>
              <p className="text-xs text-muted-foreground">max stored</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Articles
            </CardTitle>
            <CardDescription>
              Last 5 articles you've read
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentArticles.length === 0 ? (
              <Alert>
                <AlertDescription>No reading history yet. Start reading some articles!</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {stats.recentArticles.map((article, index) => (
                  <div
                    key={`${article.url}-${index}`}
                    className="border border-border rounded-lg p-3"
                  >
                    <p className="font-medium text-sm">{article.title}</p>
                    {article.author && (
                      <p className="text-xs text-muted-foreground">by {article.author}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {article.url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(article.fetchedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
