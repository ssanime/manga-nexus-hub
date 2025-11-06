-- Add DELETE policy for manga table
CREATE POLICY "Authenticated users can delete manga"
ON public.manga
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for chapters table  
CREATE POLICY "Authenticated users can delete chapters"
ON public.chapters
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for chapter_pages table
CREATE POLICY "Authenticated users can delete pages"
ON public.chapter_pages
FOR DELETE
USING (auth.uid() IS NOT NULL);