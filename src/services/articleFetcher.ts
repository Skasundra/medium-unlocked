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

interface ExtractionStrategy {
  method: string;
  url: string;
  timeout: number;
}

export class ArticleFetcher {
  private static readonly CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  private static readonly CORS_PROXY_ALT = 'https://corsproxy.io/?';
  
  static async fetchArticle(url: string): Promise<{
    content: string;
    title: string;
    author: string;
    wordCount: number;
    readingTime: number;
    warning?: string;
  }> {
    // Validate Medium URL
    const mediumPattern = /^https?:\/\/(www\.)?(medium\.com|[a-zA-Z0-9-]+\.medium\.com)/;
    if (!mediumPattern.test(url)) {
      throw new Error('Please provide a valid Medium article URL');
    }

    // Define extraction strategies
    const strategies: ExtractionStrategy[] = [
      { 
        method: 'freedium-primary', 
        url: `https://freedium-mirror.cfd/${url}`, 
        timeout: 30000 
      },
      { 
        method: 'freedium-alternative', 
        url: `https://freedium.cfd/${url}`, 
        timeout: 30000 
      },
      { 
        method: 'scribe-rip', 
        url: `https://scribe.rip/${url.replace(/https?:\/\/(www\.)?medium\.com\//, '')}`, 
        timeout: 30000 
      },
      { 
        method: 'direct-cors-proxy', 
        url: `${this.CORS_PROXY}${encodeURIComponent(url)}`, 
        timeout: 25000 
      },
      { 
        method: 'direct-cors-alt', 
        url: `${this.CORS_PROXY_ALT}${encodeURIComponent(url)}`, 
        timeout: 25000 
      },
    ];

    let bestResult: ExtractionResult | null = null;
    let lastError: Error | null = null;

    // Try each strategy
    for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
      const strategy = strategies[strategyIndex];
      const maxRetries = strategyIndex < 2 ? 2 : 1;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Trying ${strategy.method}, attempt ${attempt}/${maxRetries}`);
          
          const result = await this.extractWithStrategy(strategy);
          
          if (result && result.completenessScore >= 70) {
            console.log(`High quality success with ${strategy.method}, score: ${result.completenessScore}`);
            return {
              content: result.content,
              title: result.title,
              author: result.author,
              wordCount: result.wordCount,
              readingTime: result.readingTime,
            };
          } else if (result && result.completenessScore >= 40) {
            console.log(`Good quality content with ${strategy.method}, score: ${result.completenessScore}`);
            if (!bestResult || result.completenessScore > bestResult.completenessScore) {
              bestResult = result;
            }
          }

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(2, attempt - 1)));
          }

        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`Failed with ${strategy.method}, attempt ${attempt}:`, lastError.message);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(2, attempt - 1)));
          }
        }
      }
    }

    // Return best result if available
    if (bestResult && bestResult.completenessScore >= 35) {
      console.log('Returning best available result with warning');
      return {
        content: bestResult.content,
        title: bestResult.title,
        author: bestResult.author,
        wordCount: bestResult.wordCount,
        readingTime: bestResult.readingTime,
        warning: 'Article extraction was partially successful. Some content may be missing.',
      };
    }

    throw lastError || new Error('All extraction methods failed');
  }

  private static async extractWithStrategy(strategy: ExtractionStrategy): Promise<ExtractionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), strategy.timeout);

    try {
      const headers = this.getBrowserHeaders(strategy.method);

      const response = await fetch(strategy.url, {
        signal: controller.signal,
        headers,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      if (html.length < 500) {
        throw new Error('Response too short, likely empty or error page');
      }

      const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (textContent.length < 200) {
        throw new Error('Insufficient text content in response');
      }

      const extracted = this.extractContent(html);
      const completenessScore = this.calculateCompletenessScore(extracted, html);

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

  private static getBrowserHeaders(method: string): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    if (method.includes('direct')) {
      baseHeaders['Referer'] = 'https://www.google.com/';
    }

    return baseHeaders;
  }
  private static extractContent(html: string): {
    content: string;
    title: string;
    author: string;
    plainText: string;
  } {
    let title = 'Untitled Article';
    const titlePatterns = [
      // Medium-specific patterns
      /<h1[^>]*data-testid="storyTitle"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*(?:graf--title|story-title|post-title)[^"]*"[^>]*>([^<]+)<\/h1>/i,
      // Freedium patterns
      /<h1[^>]*class="[^"]*(?:title|heading|headline)[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*id="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      // Generic patterns
      /<h1[^>]*>([^<]+)<\/h1>/i,
      // Meta tags
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i,
      /<meta[^>]*property="article:title"[^>]*content="([^"]+)"/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].length > 5) {
        title = this.cleanText(match[1])
          .replace(/ \| by .+$/, '')
          .replace(/ - Freedium$/, '')
          .replace(/ \| Medium$/, '')
          .replace(/ - Medium$/, '')
          .replace(/ \| Scribe$/, '')
          .replace(/ - Scribe$/, '')
          .trim();
        if (title.length > 10) break;
      }
    }

    let author = '';
    const authorPatterns = [
      // Medium-specific patterns
      /<a[^>]*data-testid="authorName"[^>]*>([^<]+)<\/a>/i,
      /<span[^>]*data-testid="authorName"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="[^"]*author[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/i,
      // Freedium patterns
      /<a[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/a>/i,
      /<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/div>/i,
      // Meta tags
      /<meta[^>]*name="author"[^>]*content="([^"]+)"/i,
      /<meta[^>]*property="article:author"[^>]*content="([^"]+)"/i,
      // Generic patterns
      /by\s+<a[^>]*>([^<]+)<\/a>/i,
      /By\s+([A-Za-z\s]{3,30})/i,
      /<address[^>]*>.*?([A-Za-z\s]{3,30})<\/address>/i,
    ];

    for (const pattern of authorPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 2 && match[1].trim().length < 50) {
        const potentialAuthor = this.cleanText(match[1]).trim();
        if (!potentialAuthor.match(/^(follow|subscribe|share|read|more|continue|click|here|medium|freedium|scribe)$/i)) {
          author = potentialAuthor;
          break;
        }
      }
    }

    let content = '';
    const contentPatterns = [
      // Medium-specific patterns
      /<article[^>]*data-testid="storyContent"[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*postArticle-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<section[^>]*data-field="body"[^>]*>([\s\S]*?)<\/section>/gi,
      // Freedium patterns
      /<article[^>]*class="[^"]*story[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*story-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // Generic article patterns
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*(?:post-content|article-content|story-content|main-content|entry-content|content-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<section[^>]*class="[^"]*(?:post|article|story|content|body|main)[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
      /<main[^>]*class="[^"]*(?:content|article|story)[^"]*"[^>]*>([\s\S]*?)<\/main>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      // Fallback to div with lots of paragraphs
      /<div[^>]*>(?=[\s\S]*<p[^>]*>[\s\S]*<p[^>]*>[\s\S]*<p[^>]*>)([\s\S]*?)<\/div>/gi,
    ];

    let bestContent = '';
    let bestScore = 0;

    for (const pattern of contentPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const potentialContent = match[1];
          const textLength = potentialContent.replace(/<[^>]+>/g, '').trim().length;
          const paragraphCount = (potentialContent.match(/<p[^>]*>/gi) || []).length;
          const score = textLength + (paragraphCount * 100);
          
          if (score > bestScore && textLength > 300) {
            bestContent = potentialContent;
            bestScore = score;
          }
        }
      }
    }

    content = bestContent;

    if (content.length < 1000) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      } else {
        content = html;
      }
    }

    content = this.sanitizeContent(content);

    const plainText = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/\s+/g, ' ')
      .trim();

    return { content, title, author, plainText };
  }

  private static sanitizeContent(content: string): string {
    const removePatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      /<noscript[^>]*>[\s\S]*?<\/noscript>/gi,
      /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
      /<form[^>]*>[\s\S]*?<\/form>/gi,
      /<input[^>]*>/gi,
      /<button[^>]*>[\s\S]*?<\/button>/gi,
      /<select[^>]*>[\s\S]*?<\/select>/gi,
      /<textarea[^>]*>[\s\S]*?<\/textarea>/gi,
      /<nav[^>]*>[\s\S]*?<\/nav>/gi,
      /<footer[^>]*>[\s\S]*?<\/footer>/gi,
      /<header[^>]*class="[^"]*(?:site-header|main-header|top-header|navigation)[^"]*"[^>]*>[\s\S]*?<\/header>/gi,
      /<aside[^>]*>[\s\S]*?<\/aside>/gi,
      /<div[^>]*class="[^"]*(?:clap|follow|share|subscribe|highlight|tooltip|popup|modal)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<div[^>]*data-testid="[^"]*(?:clap|follow|share|subscribe)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
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
    content = content.replace(/\s*data-(?:track|analytics|pixel|beacon)[\w-]*="[^"]*"/gi, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/\s{3,}/g, ' ');
    
    return content.trim();
  }

  private static calculateCompletenessScore(
    extracted: { content: string; title: string; author: string; plainText: string }, 
    html: string
  ): number {
    let score = 0;

    // Title quality (0-25 points)
    if (extracted.title && extracted.title !== 'Untitled Article') {
      if (extracted.title.length > 20) score += 25;
      else if (extracted.title.length > 10) score += 20;
      else if (extracted.title.length > 5) score += 15;
    }

    // Author presence (0-15 points)
    if (extracted.author && extracted.author.length > 2) {
      if (extracted.author.length > 5 && extracted.author.length < 50) score += 15;
      else score += 10;
    }

    // Content length scoring (0-30 points)
    const wordCount = extracted.plainText.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 2000) score += 30;
    else if (wordCount > 1000) score += 25;
    else if (wordCount > 500) score += 20;
    else if (wordCount > 300) score += 15;
    else if (wordCount > 100) score += 10;
    else if (wordCount > 50) score += 5;

    // Structure quality (0-20 points)
    const paragraphCount = (extracted.content.match(/<p[^>]*>/gi) || []).length;
    if (paragraphCount > 10) score += 15;
    else if (paragraphCount > 5) score += 12;
    else if (paragraphCount > 3) score += 8;
    else if (paragraphCount > 1) score += 5;

    const headingCount = (extracted.content.match(/<h[1-6][^>]*>/gi) || []).length;
    if (headingCount > 0) score += 5;

    // Media content (0-10 points)
    const imageCount = (extracted.content.match(/<img[^>]*src="[^"]+"/gi) || []).length;
    if (imageCount > 3) score += 10;
    else if (imageCount > 1) score += 7;
    else if (imageCount > 0) score += 5;

    // Content quality indicators (bonus points)
    const hasReadTime = html.includes('min read') || html.includes('minute') || html.includes('reading time');
    if (hasReadTime) score += 3;

    const hasQuotes = (extracted.content.match(/<blockquote[^>]*>/gi) || []).length > 0;
    if (hasQuotes) score += 3;

    const hasLists = (extracted.content.match(/<[uo]l[^>]*>/gi) || []).length > 0;
    if (hasLists) score += 2;

    const hasLinks = (extracted.content.match(/<a[^>]*href="[^"]+"/gi) || []).length;
    if (hasLinks > 5) score += 2;

    return Math.min(100, score);
  }

  private static cleanText(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}