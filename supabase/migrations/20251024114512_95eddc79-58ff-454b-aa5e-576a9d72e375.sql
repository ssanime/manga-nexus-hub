-- Add source column to scrape_jobs table
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'onma';

-- Add check constraint for valid sources
ALTER TABLE scrape_jobs ADD CONSTRAINT scrape_jobs_source_check 
  CHECK (source IN ('onma', 'lekmanga', 'azoramoon'));