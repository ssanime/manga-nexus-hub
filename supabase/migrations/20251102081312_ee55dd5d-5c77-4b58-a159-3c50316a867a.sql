-- Allow authenticated users to delete their own scrape_jobs
CREATE POLICY "Authenticated users can delete scrape jobs"
  ON public.scrape_jobs
  FOR DELETE
  USING (auth.uid() IS NOT NULL);