-- Create scraper_sources table to manage different manga sources
CREATE TABLE IF NOT EXISTS public.scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraper_sources ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active sources"
  ON public.scraper_sources
  FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sources"
  ON public.scraper_sources
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sources"
  ON public.scraper_sources
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sources"
  ON public.scraper_sources
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_scraper_sources_updated_at
  BEFORE UPDATE ON public.scraper_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default lekmanga source
INSERT INTO public.scraper_sources (name, base_url, config)
VALUES (
  'lekmanga',
  'https://lekmanga.net',
  '{
    "selectors": {
      "title": "h1.entry-title, .post-title, h1.manga-title",
      "cover": ".summary_image img, img.wp-post-image, .manga-cover img",
      "description": ".summary__content, .description-summary .summary__content, .manga-excerpt",
      "status": ".post-status .summary-content, .manga-status",
      "genres": ".genres-content a, .manga-genres a",
      "author": ".author-content, .manga-author",
      "artist": ".artist-content, .manga-artist",
      "chapters": "li.wp-manga-chapter, .chapter-item",
      "chapterTitle": "a",
      "chapterUrl": "a",
      "chapterDate": ".chapter-release-date",
      "pageImages": ".reading-content img, img.wp-manga-chapter-img, .page-break img"
    }
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;