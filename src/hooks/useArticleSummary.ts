import { useState, useCallback } from 'react';

// Simple client-side text summarization using sentence extraction
function extractKeyPoints(htmlContent: string, title: string): string[] {
  // Strip HTML tags
  const textContent = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences
  const sentences = textContent
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300); // Filter out too short/long sentences

  if (sentences.length === 0) {
    return ['📄 This article could not be summarized automatically.'];
  }

  // Calculate word frequency (excluding common words)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'shall', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
    'as', 'if', 'then', 'because', 'while', 'although', 'though', 'after', 'before',
    'into', 'through', 'during', 'about', 'against', 'between', 'under', 'again',
    'there', 'here', 'out', 'up', 'down', 'off', 'over', 'any', 'its', 'your', 'their',
    'our', 'his', 'her', 'my', 'your', 'one', 'two', 'first', 'new', 'even', 'way',
    'many', 'much', 'get', 'got', 'make', 'made', 'like', 'well', 'back', 'know',
    'take', 'come', 'see', 'think', 'look', 'want', 'give', 'use', 'find', 'tell',
    'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'good', 'great', 'little',
    'long', 'own', 'still', 'thing', 'said', 'say', 'says', 'people', 'time', 'year',
    'years', 'really', 'something', 'going', 'dont', 'cant', 'wont', 'didnt', 'doesnt',
    'isnt', 'arent', 'wasnt', 'werent', 'thats', 'whats', 'youre', 'im', 'ive', 'youve',
    'weve', 'theyve', 'hes', 'shes', 'its', 'lets', 'theres', 'heres'
  ]);

  const wordFreq: Record<string, number> = {};
  const words = textContent.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Score each sentence
  const scoredSentences = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;

    // Word frequency score
    sentenceWords.forEach(word => {
      if (wordFreq[word]) {
        score += wordFreq[word];
      }
    });

    // Normalize by sentence length
    score = score / Math.max(sentenceWords.length, 1);

    // Boost for position (first sentences often important)
    if (index < 3) score *= 1.5;
    if (index < sentences.length * 0.1) score *= 1.3;

    // Boost for sentences containing title words
    const titleWords = title.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    titleWords.forEach(word => {
      if (sentence.toLowerCase().includes(word)) {
        score *= 1.2;
      }
    });

    // Boost for sentences with key indicator phrases
    const keyPhrases = ['important', 'key', 'main', 'essential', 'critical', 'significant', 
                        'conclusion', 'result', 'found', 'discovered', 'shows', 'proves',
                        'research', 'study', 'according', 'suggests', 'indicates'];
    keyPhrases.forEach(phrase => {
      if (sentence.toLowerCase().includes(phrase)) {
        score *= 1.3;
      }
    });

    return { sentence, score, index };
  });

  // Sort by score and pick top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index); // Re-sort by original position

  // Add emojis for visual appeal
  const emojis = ['📌', '💡', '🎯', '✨', '📍', '🔑', '💫', '📝'];
  
  return topSentences.map((item, i) => {
    const emoji = emojis[i % emojis.length];
    return `${emoji} ${item.sentence}`;
  });
}

export function useArticleSummary() {
  const [summary, setSummary] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (content: string, title: string) => {
    setIsLoading(true);
    setError(null);
    setSummary([]);

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const keyPoints = extractKeyPoints(content, title);
      setSummary(keyPoints);
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
