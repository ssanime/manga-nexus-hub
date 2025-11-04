-- Add unique constraints for upsert operations in scraper

-- 1. Make source_url unique in manga table
ALTER TABLE manga ADD CONSTRAINT manga_source_url_unique UNIQUE (source_url);

-- 2. Add unique constraint for manga_id and chapter_number in chapters table
ALTER TABLE chapters ADD CONSTRAINT chapters_manga_chapter_unique UNIQUE (manga_id, chapter_number);

-- 3. Add unique constraint for chapter_id and page_number in chapter_pages table
ALTER TABLE chapter_pages ADD CONSTRAINT chapter_pages_chapter_page_unique UNIQUE (chapter_id, page_number);
