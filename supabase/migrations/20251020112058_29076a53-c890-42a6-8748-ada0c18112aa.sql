-- Add source column to manga table to track which source each manga came from
-- This makes it easier to re-scrape and manage manga from different sources

-- First check if column doesn't exist (idempotent migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'manga' 
        AND column_name = 'source'
    ) THEN
        -- Add source column with default value
        ALTER TABLE public.manga 
        ADD COLUMN source TEXT NOT NULL DEFAULT 'lekmanga';
        
        -- Create index for better query performance
        CREATE INDEX idx_manga_source ON public.manga(source);
    END IF;
END $$;