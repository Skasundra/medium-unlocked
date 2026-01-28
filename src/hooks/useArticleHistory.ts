import { useState, useEffect } from 'react';

export interface ArticleHistoryItem {
  url: string;
  title: string;
  author: string;
  fetchedAt: string;
}

const STORAGE_KEY = 'medium-reader-history';
const MAX_HISTORY_ITEMS = 20;

export function useArticleHistory() {
  const [history, setHistory] = useState<ArticleHistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (item: Omit<ArticleHistoryItem, 'fetchedAt'>) => {
    setHistory((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((h) => h.url !== item.url);
      
      const newHistory = [
        { ...item, fetchedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  const removeFromHistory = (url: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((h) => h.url !== url);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return { history, addToHistory, clearHistory, removeFromHistory };
}
