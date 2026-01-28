import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, TrendingUp, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExtractionLog {
  id: string;
  url: string;
  attempt_number: number;
  method: string;
  status: string;
  error_message: string | null;
  response_time_ms: number;
  content_length: number;
  completeness_indicators: { completeness_score: number };
  created_at: string;
}

interface URLReliability {
  id: string;
  url_pattern: string;
  total_attempts: number;
  successful_attempts: number;
  best_method: string;
  average_response_time_ms: number;
  last_success_at: string | null;
}

interface Stats {
  totalExtractions: number;
  successfulExtractions: number;
  failedExtractions: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

const Analytics = () => {
  const [logs, setLogs] = useState<ExtractionLog[]>([]);
  const [reliability, setReliability] = useState<URLReliability[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const [logsResult, reliabilityResult] = await Promise.all([
        supabase
          .from('extraction_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('url_reliability')
          .select('*')
          .order('total_attempts', { ascending: false })
          .limit(20),
      ]);

      if (logsResult.data) {
        setLogs(logsResult.data as ExtractionLog[]);
        calculateStats(logsResult.data as ExtractionLog[]);
      }

      if (reliabilityResult.data) {
        setReliability(reliabilityResult.data as URLReliability[]);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: ExtractionLog[]) => {
    const total = logs.length;
    const successful = logs.filter(l => l.status === 'success').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const cacheHits = logs.filter(l => l.method === 'cache').length;

    const avgTime = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.response_time_ms, 0) / logs.length)
      : 0;

    setStats({
      totalExtractions: total,
      successfulExtractions: successful,
      failedExtractions: failed,
      averageResponseTime: avgTime,
      cacheHitRate: total > 0 ? Math.round((cacheHits / total) * 100) : 0,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Database className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Extraction Analytics
          </h1>
          <p className="text-muted-foreground">
            Monitor article extraction performance and reliability metrics
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Extractions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalExtractions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.totalExtractions > 0
                    ? Math.round((stats.successfulExtractions / stats.totalExtractions) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.failedExtractions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(stats.averageResponseTime / 1000).toFixed(1)}s
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cache Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.cacheHitRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                URL Reliability
              </CardTitle>
              <CardDescription>
                Most frequently accessed URL patterns and their success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {reliability.length === 0 ? (
                    <Alert>
                      <AlertDescription>No reliability data available yet</AlertDescription>
                    </Alert>
                  ) : (
                    reliability.map((item) => (
                      <div
                        key={item.id}
                        className="border border-border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate flex-1">
                            {item.url_pattern}
                          </span>
                          <Badge variant="outline">
                            {Math.round((item.successful_attempts / item.total_attempts) * 100)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Attempts: {item.total_attempts}</span>
                          <span>Success: {item.successful_attempts}</span>
                          <span>Method: {item.best_method || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg: {(item.average_response_time_ms / 1000).toFixed(2)}s
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Extraction Logs
              </CardTitle>
              <CardDescription>
                Last 50 extraction attempts with status and timing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <Alert>
                      <AlertDescription>No logs available yet</AlertDescription>
                    </Alert>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="border border-border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">
                              {log.url}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(log.status)}
                              <span className="text-xs text-muted-foreground">
                                {log.method}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium">
                              {(log.response_time_ms / 1000).toFixed(2)}s
                            </div>
                            {log.completeness_indicators?.completeness_score > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Score: {log.completeness_indicators.completeness_score}
                              </div>
                            )}
                          </div>
                        </div>
                        {log.error_message && (
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-xs">
                              {log.error_message}
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
