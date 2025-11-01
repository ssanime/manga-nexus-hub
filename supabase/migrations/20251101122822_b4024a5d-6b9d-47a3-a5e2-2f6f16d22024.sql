-- Add new columns to manga table for enhanced features

-- Media fields
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS gallery TEXT[];
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS trailer_url TEXT;

-- Basic manga data
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS chapter_count INTEGER DEFAULT 0;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Technical/Search data
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'العربية';
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS reading_direction TEXT DEFAULT 'rtl';
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '{}'::jsonb;

-- Admin tools
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'published';
ALTER TABLE public.manga ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Create index for featured manga
CREATE INDEX IF NOT EXISTS idx_manga_featured ON public.manga(is_featured, sort_order) WHERE is_featured = true;

-- Create index for publish status
CREATE INDEX IF NOT EXISTS idx_manga_publish_status ON public.manga(publish_status);

-- Create function to auto-update chapter_count
CREATE OR REPLACE FUNCTION update_manga_chapter_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.manga 
    SET chapter_count = chapter_count + 1,
        updated_at = now()
    WHERE id = NEW.manga_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.manga 
    SET chapter_count = GREATEST(0, chapter_count - 1),
        updated_at = now()
    WHERE id = OLD.manga_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update chapter count
DROP TRIGGER IF EXISTS trigger_update_manga_chapter_count ON public.chapters;
CREATE TRIGGER trigger_update_manga_chapter_count
AFTER INSERT OR DELETE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION update_manga_chapter_count();

-- Initialize chapter_count for existing manga
UPDATE public.manga m
SET chapter_count = (
  SELECT COUNT(*) 
  FROM public.chapters c 
  WHERE c.manga_id = m.id
);