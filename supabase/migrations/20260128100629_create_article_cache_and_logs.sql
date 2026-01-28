/*
  # Article Extraction System - Database Schema

  ## New Tables
  
  ### `article_cache`
  Stores successfully extracted articles to avoid re-fetching
  - `id` (uuid, primary key)
  - `url` (text, unique) - Original article URL
  - `title` (text) - Article title
  - `author` (text) - Article author
  - `content` (text) - Full HTML content
  - `plain_text` (text) - Plain text version
  - `word_count` (integer) - Number of words
  - `reading_time` (integer) - Estimated reading time in minutes
  - `extraction_method` (text) - Method used to extract (freedium, direct, etc.)
  - `completeness_score` (integer) - Score 0-100 indicating content completeness
  - `metadata` (jsonb) - Additional metadata (images, links, etc.)
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz) - Cache expiration (7 days)

  ### `extraction_logs`
  Tracks all extraction attempts for monitoring and debugging
  - `id` (uuid, primary key)
  - `url` (text) - Target URL
  - `attempt_number` (integer) - Retry attempt number
  - `method` (text) - Extraction method used
  - `status` (text) - success, partial, failed
  - `error_message` (text) - Error details if failed
  - `response_time_ms` (integer) - Time taken in milliseconds
  - `content_length` (integer) - Length of extracted content
  - `completeness_indicators` (jsonb) - Metrics about completeness
  - `created_at` (timestamptz)

  ### `url_reliability`
  Tracks URL pattern reliability for intelligent routing
  - `id` (uuid, primary key)
  - `url_pattern` (text, unique) - Domain or URL pattern
  - `total_attempts` (integer) - Total extraction attempts
  - `successful_attempts` (integer) - Successful extractions
  - `best_method` (text) - Most successful extraction method
  - `average_response_time_ms` (integer) - Average response time
  - `last_success_at` (timestamptz) - Last successful extraction
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Allow public read access for cached articles (with limits)
  - Restrict write access to service role only
*/

-- Create article_cache table
CREATE TABLE IF NOT EXISTS article_cache (
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

-- Create extraction_logs table
CREATE TABLE IF NOT EXISTS extraction_logs (
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

-- Create url_reliability table
CREATE TABLE IF NOT EXISTS url_reliability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_pattern text UNIQUE NOT NULL,
  total_attempts integer DEFAULT 0,
  successful_attempts integer DEFAULT 0,
  best_method text,
  average_response_time_ms integer DEFAULT 0,
  last_success_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_cache_url ON article_cache(url);
CREATE INDEX IF NOT EXISTS idx_article_cache_expires_at ON article_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_url ON extraction_logs(url);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_created_at ON extraction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(status);
CREATE INDEX IF NOT EXISTS idx_url_reliability_pattern ON url_reliability(url_pattern);

-- Enable RLS
ALTER TABLE article_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_reliability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for article_cache
CREATE POLICY "Allow public read access to cached articles"
  ON article_cache
  FOR SELECT
  TO anon
  USING (expires_at > now());

CREATE POLICY "Allow service role full access to article_cache"
  ON article_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for extraction_logs
CREATE POLICY "Allow service role full access to extraction_logs"
  ON extraction_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to recent extraction logs"
  ON extraction_logs
  FOR SELECT
  TO anon
  USING (created_at > now() - interval '1 hour');

-- RLS Policies for url_reliability
CREATE POLICY "Allow public read access to url_reliability"
  ON url_reliability
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow service role full access to url_reliability"
  ON url_reliability
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM article_cache WHERE expires_at < now();
END;
$$;

-- Function to get URL pattern from full URL
CREATE OR REPLACE FUNCTION extract_url_pattern(url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  pattern text;
BEGIN
  -- Extract domain from URL
  pattern := substring(url from 'https?://([^/]+)');
  RETURN COALESCE(pattern, url);
END;
$$;