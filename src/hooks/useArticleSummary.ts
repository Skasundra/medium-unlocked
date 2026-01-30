import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useArticleSummary() {
  const [summary, setSummary] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (content: string, title: string) => {
    setIsLoading(true);
    setError(null);
    setSummary([]);

    try {
      // Strip HTML tags for the AI
      const textContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const { data, error: functionError } = await supabase.functions.invoke('summarize-article', {
        body: { content: textContent, title }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate summary');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.summary && Array.isArray(data.summary)) {
        setSummary(data.summary);
      } else {
        throw new Error('Invalid summary response');
      }
    } catch (err) {
      console.error('Summary error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSummary = useCallback(() => {
    setSummary([]);
    setError(null);
  }, []);

  return {
    summary,
    isLoading,
    error,
    generateSummary,
    clearSummary
  };
}
