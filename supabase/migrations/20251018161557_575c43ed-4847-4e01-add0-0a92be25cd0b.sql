-- Create manga table
CREATE TABLE public.manga (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  alternative_titles TEXT[],
  cover_url TEXT,
  description TEXT,
  status TEXT CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  author TEXT,
  artist TEXT,
  genres TEXT[],
  rating DECIMAL(3,1) DEFAULT 0,
  views INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  year INTEGER,
  source TEXT NOT NULL DEFAULT 'lekmanga',
  source_url TEXT NOT NULL,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manga_id UUID NOT NULL REFERENCES public.manga(id) ON DELETE CASCADE,
  chapter_number DECIMAL(10,2) NOT NULL,
  title TEXT,
  release_date DATE,
  views INTEGER DEFAULT 0,
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manga_id, chapter_number)
);

-- Create pages table for chapter images
CREATE TABLE public.chapter_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, page_number)
);

-- Create scraping jobs table
CREATE TABLE public.scrape_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manga_id UUID REFERENCES public.manga(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  job_type TEXT NOT NULL CHECK (job_type IN ('manga_info', 'chapters', 'pages')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_manga_slug ON public.manga(slug);
CREATE INDEX idx_manga_source ON public.manga(source);
CREATE INDEX idx_chapters_manga_id ON public.chapters(manga_id);
CREATE INDEX idx_chapter_pages_chapter_id ON public.chapter_pages(chapter_id);
CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_manga_id ON public.scrape_jobs(manga_id);

-- Enable Row Level Security
ALTER TABLE public.manga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manga (public read, admin write)
CREATE POLICY "Anyone can view manga"
  ON public.manga FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert manga"
  ON public.manga FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update manga"
  ON public.manga FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for chapters (public read, admin write)
CREATE POLICY "Anyone can view chapters"
  ON public.chapters FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert chapters"
  ON public.chapters FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update chapters"
  ON public.chapters FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for pages (public read, admin write)
CREATE POLICY "Anyone can view pages"
  ON public.chapter_pages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert pages"
  ON public.chapter_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for scrape jobs
CREATE POLICY "Authenticated users can view scrape jobs"
  ON public.scrape_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert scrape jobs"
  ON public.scrape_jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update scrape jobs"
  ON public.scrape_jobs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_manga
  BEFORE UPDATE ON public.manga
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_chapters
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_scrape_jobs
  BEFORE UPDATE ON public.scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();