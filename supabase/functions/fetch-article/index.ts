import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractionResult {
  content: string;
  title: string;
  author: string;
  plainText: string;
  wordCount: number;
  readingTime: number;
  completenessScore: number;
  method: string;
}

interface ExtractionAttempt {
  method: string;
  url: string;
  timeout: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mediumPattern = /^https?:\/\/(www\.)?(medium\.com|[a-zA-Z0-9-]+\.medium\.com)/;
    if (!mediumPattern.test(url)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid Medium article URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define extraction strategies with retry logic
    const strategies: ExtractionAttempt[] = [
      { method: 'freedium-primary', url: `https://freedium-mirror.cfd/${url}`, timeout: 25000 },
      { method: 'freedium-alternative', url: `https://freedium.cfd/${url}`, timeout: 25000 },
      { method: 'direct-fetch', url: url, timeout: 20000 },
    ];

    let lastError: Error | null = null;
    let result: ExtractionResult | null = null;

    // Try each strategy with retries
    for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
      const strategy = strategies[strategyIndex];
      const maxRetries = strategyIndex === 0 ? 2 : 1;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries} with ${strategy.method}`);

          result = await extractWithStrategy(strategy);

          if (result && result.completenessScore >= 60) {
            console.log(`Success with ${strategy.method}, score: ${result.completenessScore}`);

            return new Response(
              JSON.stringify({
                content: result.content,
                title: result.title,
                author: result.author,
                wordCount: result.wordCount,
                readingTime: result.readingTime,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else if (result) {
            console.log(`Partial content with ${strategy.method}, score: ${result.completenessScore}`);
          }

          if (attempt < maxRetries) {
            const backoffMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }

        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`Failed with ${strategy.method}, attempt ${attempt}:`, lastError.message);

          if (attempt < maxRetries) {
            const backoffMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }
    }

    if (result && result.completenessScore >= 40) {
      console.log('Returning partial result with warning');
      return new Response(
        JSON.stringify({
          content: result.content,
          title: result.title,
          author: result.author,
          wordCount: result.wordCount,
          readingTime: result.readingTime,
          warning: 'Article may be incomplete. Content extraction was partially successful.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw lastError || new Error('All extraction methods failed');

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch article';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractWithStrategy(strategy: ExtractionAttempt): Promise<ExtractionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), strategy.timeout);

  try {
    const headers = getBrowserHeaders(strategy.method);

    const response = await fetch(strategy.url, {
      signal: controller.signal,
      headers,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    if (html.length < 1000) {
      throw new Error('Response too short, likely empty or error page');
    }

    const extracted = extractContent(html);
    const completenessScore = calculateCompletenessScore(extracted, html);

    const wordCount = extracted.plainText.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      ...extracted,
      wordCount,
      readingTime,
      completenessScore,
      method: strategy.method,
    };

  } finally {
    clearTimeout(timeoutId);
  }
}

function getBrowserHeaders(method: string): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  };

  if (method === 'direct-fetch') {
    baseHeaders['Referer'] = 'https://www.google.com/';
  }

  return baseHeaders;
}

function extractContent(html: string): {
  content: string;
  title: string;
  author: string;
  plainText: string;
} {
  let title = 'Untitled Article';
  const titlePatterns = [
    /<h1[^>]*class="[^"]*(?:title|heading|headline)[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ];

  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].length > 5) {
      title = cleanText(match[1])
        .replace(/ \| by .+$/, '')
        .replace(/ - Freedium$/, '')
        .replace(/ \| Medium$/, '')
        .replace(/ - Medium$/, '')
        .trim();
      break;
    }
  }

  let author = '';
  const authorPatterns = [
    /<a[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/a>/i,
    /<meta[^>]*name="author"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="article:author"[^>]*content="([^"]+)"/i,
    /<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i,
    /by\s+<a[^>]*>([^<]+)<\/a>/i,
    /<div[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/div>/i,
  ];

  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      author = cleanText(match[1]).trim();
      break;
    }
  }

  let content = '';
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:post-content|article-content|story-content|main-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*(?:post|article|story|content|body)[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    /<main[^>]*class="[^"]*(?:content|article)[^"]*"[^>]*>([\s\S]*?)<\/main>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
  ];

  for (const pattern of contentPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > content.length) {
        const potentialContent = match[1];
        const textLength = potentialContent.replace(/<[^>]+>/g, '').trim().length;
        if (textLength > 500) {
          content = potentialContent;
        }
      }
    }
    if (content.length > 1000) break;
  }

  if (content.length < 1000) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    } else {
      content = html;
    }
  }

  content = sanitizeContent(content);

  const plainText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return { content, title, author, plainText };
}

function sanitizeContent(content: string): string {
  const removePatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    /<noscript[^>]*>[\s\S]*?<\/noscript>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<form[^>]*>[\s\S]*?<\/form>/gi,
    /<input[^>]*>/gi,
    /<button[^>]*>[\s\S]*?<\/button>/gi,
    /<nav[^>]*>[\s\S]*?<\/nav>/gi,
    /<footer[^>]*>[\s\S]*?<\/footer>/gi,
    /<header[^>]*class="[^"]*(?:site-header|main-header|top-header)[^"]*"[^>]*>[\s\S]*?<\/header>/gi,
    /<aside[^>]*>[\s\S]*?<\/aside>/gi,
    /<!--[\s\S]*?-->/g,
    /<svg[^>]*>[\s\S]*?<\/svg>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
  ];

  for (const pattern of removePatterns) {
    content = content.replace(pattern, '');
  }

  content = content.replace(/\s*on\w+="[^"]*"/gi, '');
  content = content.replace(/\s*on\w+='[^']*'/gi, '');
  content = content.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  content = content.replace(/href='javascript:[^']*'/gi, "href='#'");
  content = content.replace(/\s*data-[\w-]+="[^"]*"/gi, '');

  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  return content.trim();
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function calculateCompletenessScore(extracted: { content: string; title: string; author: string; plainText: string }, html: string): number {
  let score = 0;

  if (extracted.title && extracted.title !== 'Untitled Article' && extracted.title.length > 10) {
    score += 20;
  }

  if (extracted.author && extracted.author.length > 2) {
    score += 10;
  }

  const wordCount = extracted.plainText.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 100) score += 10;
  if (wordCount > 300) score += 10;
  if (wordCount > 500) score += 10;
  if (wordCount > 1000) score += 10;

  const paragraphCount = (extracted.content.match(/<p[^>]*>/gi) || []).length;
  if (paragraphCount > 3) score += 10;
  if (paragraphCount > 8) score += 5;

  const headingCount = (extracted.content.match(/<h[2-6][^>]*>/gi) || []).length;
  if (headingCount > 0) score += 5;

  const imageCount = (extracted.content.match(/<img[^>]*>/gi) || []).length;
  if (imageCount > 0) score += 5;

  const hasReadTime = html.includes('min read') || html.includes('minute');
  if (hasReadTime) score += 5;

  return Math.min(100, score);
}
