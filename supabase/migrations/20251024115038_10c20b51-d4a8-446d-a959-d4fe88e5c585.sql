-- Rename source_url to url in scrape_jobs table for consistency
ALTER TABLE scrape_jobs RENAME COLUMN source_url TO url;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source ON scrape_jobs(source);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);