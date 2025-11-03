-- Add custom join questions and sample chapter requirement to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS custom_questions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS require_sample_chapter boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sample_chapter_instructions text;

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.manga_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  manga_id uuid REFERENCES public.manga(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, manga_id)
);

-- Enable RLS on favorites
ALTER TABLE public.manga_favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
ON public.manga_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to favorites"
ON public.manga_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from favorites"
ON public.manga_favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create reading history table
CREATE TABLE IF NOT EXISTS public.reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  manga_id uuid REFERENCES public.manga(id) ON DELETE CASCADE NOT NULL,
  last_page_read integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, chapter_id)
);

-- Enable RLS on reading history
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Reading history policies
CREATE POLICY "Users can view their own reading history"
ON public.reading_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to reading history"
ON public.reading_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reading history"
ON public.reading_history FOR UPDATE
USING (auth.uid() = user_id);

-- Update team_join_requests to include custom answers
ALTER TABLE public.team_join_requests
ADD COLUMN IF NOT EXISTS custom_answers jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sample_chapter_url text;

-- Add trigger to update reading history timestamp
CREATE OR REPLACE FUNCTION update_reading_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reading_history_timestamp_trigger
BEFORE UPDATE ON public.reading_history
FOR EACH ROW
EXECUTE FUNCTION update_reading_history_timestamp();