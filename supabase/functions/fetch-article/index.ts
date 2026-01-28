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

    // Fetch the article
    const response = await fetch(freediumUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch article. The article may not be available.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // Extract and sanitize the main content
    const sanitizedContent = sanitizeHtml(html);

    return new Response(
      JSON.stringify({ 
        content: sanitizedContent.content,
        title: sanitizedContent.title,
        author: sanitizedContent.author,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while fetching the article' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function sanitizeHtml(html: string): { content: string; title: string; author: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/ \| by .+$/, '').replace(/ - Freedium$/, '').trim() : 'Untitled Article';

  // Try to extract author
  const authorMatch = html.match(/by\s+([^<|]+)/i) || html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i);
  const author = authorMatch ? authorMatch[1].trim() : '';

  // Try to extract main article content
  let content = '';
  
  // Look for article or main content containers
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (articleMatch) {
    content = articleMatch[1];
  } else if (mainMatch) {
    content = mainMatch[1];
  } else if (contentMatch) {
    content = contentMatch[1];
  } else {
    // Fallback: extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    content = bodyMatch ? bodyMatch[1] : html;
  }

  // Remove script tags
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove event handlers
  content = content.replace(/\s*on\w+="[^"]*"/gi, '');
  content = content.replace(/\s*on\w+='[^']*'/gi, '');
  
  // Remove javascript: URLs
  content = content.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  
  // Remove iframes
  content = content.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Remove forms
  content = content.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');
  
  // Remove input elements
  content = content.replace(/<input[^>]*>/gi, '');
  
  // Remove navigation elements that might contain ads or tracking
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  
  // Remove footer elements
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Remove header elements (but keep h1-h6)
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // Remove comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // Clean up excessive whitespace
  content = content.replace(/\s+/g, ' ').trim();

  return { content, title, author };
}
