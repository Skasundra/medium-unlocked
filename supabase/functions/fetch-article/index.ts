import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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

    // Validate it's a Medium URL
    const mediumPattern = /^https?:\/\/(www\.)?(medium\.com|[a-zA-Z0-9-]+\.medium\.com)/;
    if (!mediumPattern.test(url)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid Medium article URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct the freedium mirror URL
    const freediumUrl = `https://freedium-mirror.cfd/${url}`;

    console.log('Fetching from:', freediumUrl);

    // Fetch the article with longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(freediumUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch article. The article may not be available.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('Received HTML length:', html.length);

    // Extract and sanitize the main content
    const sanitizedContent = sanitizeHtml(html);

    // Calculate reading time (average 200 words per minute)
    const wordCount = sanitizedContent.plainText.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return new Response(
      JSON.stringify({ 
        content: sanitizedContent.content,
        title: sanitizedContent.title,
        author: sanitizedContent.author,
        wordCount,
        readingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const isAbortError = error instanceof Error && error.name === 'AbortError';
    const errorMessage = isAbortError 
      ? 'Request timed out. Please try again.'
      : 'An error occurred while fetching the article';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function sanitizeHtml(html: string): { content: string; title: string; author: string; plainText: string } {
  // Extract title - try multiple patterns
  let title = 'Untitled Article';
  const titlePatterns = [
    /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match) {
      title = match[1]
        .replace(/ \| by .+$/, '')
        .replace(/ - Freedium$/, '')
        .replace(/ \| Medium$/, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      break;
    }
  }

  // Extract author - try multiple patterns
  let author = '';
  const authorPatterns = [
    /<a[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/a>/i,
    /<meta[^>]*name="author"[^>]*content="([^"]+)"/i,
    /<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i,
    /by\s+<a[^>]*>([^<]+)<\/a>/i,
  ];
  
  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match) {
      author = match[1].trim();
      break;
    }
  }

  // Extract main article content - try multiple selectors
  let content = '';
  
  // Look for freedium-specific content containers first
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:post-content|article-content|story-content|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*(?:post|article|story|content)[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
  ];

  for (const pattern of contentPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > content.length) {
        content = match[1];
      }
    }
    if (content.length > 500) break;
  }

  // If still no good content, try to extract body and be more aggressive
  if (content.length < 500) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    } else {
      content = html;
    }
  }

  // Remove unwanted elements
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
    /<header[^>]*>[\s\S]*?<\/header>/gi,
    /<aside[^>]*>[\s\S]*?<\/aside>/gi,
    /<!--[\s\S]*?-->/g,
    /<svg[^>]*>[\s\S]*?<\/svg>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
  ];

  for (const pattern of removePatterns) {
    content = content.replace(pattern, '');
  }

  // Remove event handlers and javascript URLs
  content = content.replace(/\s*on\w+="[^"]*"/gi, '');
  content = content.replace(/\s*on\w+='[^']*'/gi, '');
  content = content.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  content = content.replace(/href='javascript:[^']*'/gi, "href='#'");

  // Remove data attributes that might contain tracking
  content = content.replace(/\s*data-[\w-]+="[^"]*"/gi, '');

  // Clean up excessive whitespace but preserve structure
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  content = content.trim();

  // Extract plain text for word count
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
