# Web Scraping System - Complete Documentation

## Overview

This is a comprehensive web scraping system designed to extract complete article content from Medium URLs with robust error handling, multiple fallback strategies, intelligent caching, and detailed monitoring.

## System Architecture

### Core Components

1. **Edge Function** (`supabase/functions/fetch-article/index.ts`)
   - Multiple extraction strategies with automatic fallback
   - Intelligent retry mechanisms with exponential backoff
   - Completeness scoring algorithm
   - Database integration for caching and logging

2. **Database Schema** (3 tables)
   - `article_cache` - Stores successfully extracted articles (7-day TTL)
   - `extraction_logs` - Tracks all extraction attempts for monitoring
   - `url_reliability` - Maintains URL pattern reliability metrics

3. **Analytics Dashboard** (`src/pages/Analytics.tsx`)
   - Real-time performance monitoring
   - Success rate tracking
   - URL reliability analysis
   - Extraction log viewer

## Key Features

### 1. Multiple Extraction Strategies

The system attempts extraction in priority order:

**Strategy 1: Freedium Primary** (`https://freedium-mirror.cfd/`)
- Timeout: 25 seconds
- Max retries: 2
- Best for most Medium articles

**Strategy 2: Freedium Alternative** (`https://freedium.cfd/`)
- Timeout: 25 seconds
- Max retries: 1
- Backup freedium service

**Strategy 3: Direct Fetch**
- Timeout: 20 seconds
- Max retries: 1
- Direct article URL with browser headers

**Strategy 4: Archive.is** (`https://archive.is/newest/`)
- Timeout: 30 seconds
- Max retries: 1
- Archived copy fallback

### 2. Retry Logic with Exponential Backoff

```typescript
// Automatic retry with backoff
if (attempt < maxRetries) {
  const backoffMs = 1000 * Math.pow(2, attempt - 1);
  await new Promise(resolve => setTimeout(resolve, backoffMs));
}
```

- First retry: 1 second delay
- Second retry: 2 seconds delay
- Prevents overwhelming target servers

### 3. Completeness Scoring Algorithm

Each extraction is scored 0-100 based on:

| Criteria | Points |
|----------|--------|
| Valid title (>10 chars) | 20 |
| Author present (>2 chars) | 10 |
| Word count > 100 | 10 |
| Word count > 300 | 10 |
| Word count > 500 | 10 |
| Word count > 1000 | 10 |
| Paragraph count > 3 | 10 |
| Paragraph count > 8 | 5 |
| Has headings (h2-h6) | 5 |
| Contains images | 5 |
| Has read time indicator | 5 |

**Thresholds:**
- Score ≥ 60: Full success, return immediately
- Score 40-59: Partial success, return with warning
- Score < 40: Continue to next strategy

### 4. Intelligent Caching System

**Cache Strategy:**
- 7-day TTL for successful extractions
- Cache key: Original article URL
- Automatic expiration cleanup
- Cache hit tracking for analytics

**Benefits:**
- Instant response for cached articles
- Reduced load on target servers
- Improved user experience
- Cost optimization

### 5. Comprehensive Logging

**Every extraction attempt logs:**
- URL and attempt number
- Extraction method used
- Status (success/partial/failed)
- Error messages (if any)
- Response time (milliseconds)
- Content length
- Completeness score
- Timestamp

### 6. URL Reliability Tracking

**Tracks per domain:**
- Total extraction attempts
- Successful attempts
- Best performing method
- Average response time
- Last successful extraction

**Uses:**
- Identify problematic URL patterns
- Optimize strategy selection
- Monitor service degradation

## Advanced Features

### Browser Headers Simulation

```typescript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Upgrade-Insecure-Requests': '1',
};
```

### Content Sanitization

**Removes:**
- All JavaScript (`<script>` tags)
- Inline styles and `<style>` tags
- Event handlers (onclick, onload, etc.)
- Tracking pixels and analytics
- Navigation, footers, headers
- Forms and input elements
- Data attributes
- SVG elements

**Preserves:**
- Article text and structure
- Images with src attributes
- Headings and paragraphs
- Lists and blockquotes
- Links (sanitized)

### Timeout Management

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), strategy.timeout);

try {
  const response = await fetch(strategy.url, {
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeoutId);
}
```

- Prevents hanging requests
- Graceful timeout handling
- Proper cleanup on success/failure

## API Response Format

### Success Response

```json
{
  "content": "<html content>",
  "title": "Article Title",
  "author": "Author Name",
  "wordCount": 1250,
  "readingTime": 7,
  "cached": false
}
```

### Partial Success Response

```json
{
  "content": "<html content>",
  "title": "Article Title",
  "author": "Author Name",
  "wordCount": 450,
  "readingTime": 3,
  "warning": "Article may be incomplete. Content extraction was partially successful.",
  "cached": false
}
```

### Error Response

```json
{
  "error": "Failed to fetch article. The article may not be available."
}
```

## Database Schema

### article_cache

```sql
CREATE TABLE article_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  title text NOT NULL,
  author text DEFAULT '',
  content text NOT NULL,
  plain_text text NOT NULL,
  word_count integer DEFAULT 0,
  reading_time integer DEFAULT 0,
  extraction_method text NOT NULL,
  completeness_score integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);
```

### extraction_logs

```sql
CREATE TABLE extraction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  attempt_number integer DEFAULT 1,
  method text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_message text,
  response_time_ms integer,
  content_length integer,
  completeness_indicators jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### url_reliability

```sql
CREATE TABLE url_reliability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_pattern text UNIQUE NOT NULL,
  total_attempts integer DEFAULT 0,
  successful_attempts integer DEFAULT 0,
  best_method text,
  average_response_time_ms integer DEFAULT 0,
  last_success_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
```

## Analytics Dashboard Features

Access at `/analytics` route

### Metrics Displayed

1. **Total Extractions** - All extraction attempts
2. **Success Rate** - Percentage of successful extractions
3. **Failed Count** - Number of failed attempts
4. **Average Response Time** - Mean extraction time
5. **Cache Hit Rate** - Percentage served from cache

### URL Reliability Panel

- Shows most accessed URL patterns
- Success rate per pattern
- Best performing extraction method
- Average response time

### Recent Extraction Logs

- Last 50 extraction attempts
- Status badges (success/failed/partial)
- Completeness scores
- Error messages
- Timestamps

### Auto-Refresh

- Refreshes every 30 seconds
- Real-time monitoring capability

## Best Practices

### 1. Rate Limiting

The system implements natural rate limiting through:
- Sequential strategy attempts
- Exponential backoff retries
- Timeout controls
- Cache-first approach

### 2. Error Handling

```typescript
try {
  // Extraction logic
  await logExtraction(supabase, url, attempt, method, 'success', null, responseTime, contentLength, score);
} catch (error) {
  await logExtraction(supabase, url, attempt, method, 'failed', error.message, responseTime, 0, 0);
}
```

Every operation logs its outcome for debugging.

### 3. Content Validation

```typescript
if (html.length < 1000) {
  throw new Error('Response too short, likely empty or error page');
}
```

Validates response before processing.

### 4. Security

- RLS (Row Level Security) enabled on all tables
- Public read access with time restrictions
- Service role for write operations
- Content sanitization removes XSS vectors

## Performance Optimization

### Database Indexes

```sql
CREATE INDEX idx_article_cache_url ON article_cache(url);
CREATE INDEX idx_article_cache_expires_at ON article_cache(expires_at);
CREATE INDEX idx_extraction_logs_url ON extraction_logs(url);
CREATE INDEX idx_extraction_logs_status ON extraction_logs(status);
```

### Cache Cleanup

```sql
CREATE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM article_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
```

Run periodically to remove expired entries.

## Troubleshooting

### Issue: Low Success Rate

**Solution:**
1. Check Analytics dashboard for error patterns
2. Review extraction logs for specific errors
3. Verify freedium services are operational
4. Consider adjusting timeout values

### Issue: Incomplete Content

**Solution:**
1. Check completeness scores in logs
2. Review content patterns for specific URLs
3. May need additional HTML selectors
4. Try different extraction strategies

### Issue: Slow Response Times

**Solution:**
1. Check average response times by method
2. Verify cache hit rate is reasonable
3. Consider increasing timeouts for specific patterns
4. Monitor URL reliability metrics

## Monitoring Queries

### Get Success Rate by Method

```sql
SELECT
  method,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM extraction_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY method
ORDER BY success_rate DESC;
```

### Get Slowest URLs

```sql
SELECT
  url,
  AVG(response_time_ms) as avg_time_ms,
  COUNT(*) as attempts
FROM extraction_logs
WHERE status = 'success'
GROUP BY url
HAVING COUNT(*) > 1
ORDER BY avg_time_ms DESC
LIMIT 10;
```

### Cache Performance

```sql
SELECT
  COUNT(*) FILTER (WHERE method = 'cache') as cache_hits,
  COUNT(*) FILTER (WHERE method != 'cache') as cache_misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE method = 'cache') / COUNT(*), 2) as hit_rate
FROM extraction_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Future Enhancements

### Potential Improvements

1. **Adaptive Strategy Selection**
   - Use URL reliability data to pick best method first
   - Learn from historical success patterns

2. **Content Verification**
   - Compare multiple extraction methods
   - Detect and flag inconsistencies

3. **Advanced Caching**
   - Predictive pre-caching for popular articles
   - Cache warming based on trends

4. **Rate Limit Detection**
   - Automatic backoff on 429 responses
   - Circuit breaker pattern

5. **JavaScript Rendering**
   - Add headless browser option for SPAs
   - Fallback for JavaScript-heavy content

## Summary

This web scraping system provides:

- **Reliability**: Multiple fallback strategies ensure high success rates
- **Performance**: Intelligent caching minimizes latency
- **Monitoring**: Comprehensive analytics for system health
- **Completeness**: Scoring algorithm ensures quality extraction
- **Scalability**: Database-backed architecture supports growth
- **Maintainability**: Detailed logging aids debugging

The system handles edge cases, respects rate limits, and provides complete visibility into extraction operations.
