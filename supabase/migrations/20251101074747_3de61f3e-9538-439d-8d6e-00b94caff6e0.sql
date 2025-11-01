-- Remove the restrictive source check constraint since sources are now dynamically managed
ALTER TABLE scrape_jobs DROP CONSTRAINT IF EXISTS scrape_jobs_source_check;

-- Add a new flexible constraint that just ensures source is not empty
ALTER TABLE scrape_jobs ADD CONSTRAINT scrape_jobs_source_not_empty CHECK (length(trim(source)) > 0);