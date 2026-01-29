import { useState, useEffect } from 'react';

export interface BookmarkItem {
  url: string;
  title: string;
  author: string;
  bookmarkedAt: string;
  wordCount?: number;
  readingTime?: number;
}

const STORAGE_KEY = 'medium-reader-bookmarks';
const MAX_BOOKMARKS = 50;

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setBookmarks(JSON.parse(stored));
      } catch {
        setBookmarks([]);
      }
    }
  }, []);

  const addBookmark = (item: Omit<BookmarkItem, 'bookmarkedAt'>) => {
    setBookmarks((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((b) => b.url !== item.url);
      
      const newBookmarks = [
        { ...item, bookmarkedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_BOOKMARKS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  const removeBookmark = (url: string) => {
    setBookmarks((prev) => {
      const newBookmarks = prev.filter((b) => b.url !== url);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  const isBookmarked = (url: string) => {
    return bookmarks.some((b) => b.url === url);
  };

  const clearBookmarks = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBookmarks([]);
  };

  return { 
    bookmarks, 
    addBookmark, 
    removeBookmark, 
    isBookmarked, 
    clearBookmarks 
  };
}