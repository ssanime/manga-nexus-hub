-- Fix scrape_jobs job_type constraint to include 'catalog'
ALTER TABLE scrape_jobs 
DROP CONSTRAINT IF EXISTS scrape_jobs_job_type_check;

ALTER TABLE scrape_jobs 
ADD CONSTRAINT scrape_jobs_job_type_check 
CHECK (job_type IN ('manga_info', 'chapters', 'pages', 'catalog'));