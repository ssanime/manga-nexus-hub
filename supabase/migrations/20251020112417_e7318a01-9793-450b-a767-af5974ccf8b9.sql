-- Add more sources for manga scraping
INSERT INTO public.scraper_sources (name, base_url, config) VALUES
(
  'azoramoon',
  'https://azoramoon.com',
  '{
    "selectors": {
      "title": "h1.entry-title, .post-title",
      "cover": ".summary_image img, img.wp-post-image",
      "description": ".summary__content, .description",
      "status": ".post-status, .summary-content",
      "genres": ".genres a, .tags a",
      "author": ".author-content",
      "artist": ".artist-content",
      "chapters": "li.wp-manga-chapter, .chapter-item",
      "chapterTitle": "a",
      "chapterUrl": "a",
      "chapterDate": ".chapter-release-date, .post-on",
      "pageImages": ".reading-content img, .page-break img"
    }
  }'::jsonb
),
(
  'dilar',
  'https://dilar.tube',
  '{
    "selectors": {
      "title": "h1.manga-title, .title",
      "cover": ".manga-cover img, .cover img",
      "description": ".manga-description, .description",
      "status": ".manga-status, .status",
      "genres": ".genres a, .tags a",
      "author": ".author",
      "artist": ".artist",
      "chapters": ".chapter-item, .chapters li",
      "chapterTitle": "a, .chapter-title",
      "chapterUrl": "a",
      "chapterDate": ".chapter-date, .date",
      "pageImages": ".manga-page img, .page img"
    }
  }'::jsonb
),
(
  'onma',
  'https://onma.top',
  '{
    "selectors": {
      "title": "h1.manga-title, .title",
      "cover": ".manga-cover img, img.cover",
      "description": ".manga-description, .summary",
      "status": ".manga-status, .status",
      "genres": ".genres a, .tags a",
      "author": ".author",
      "artist": ".artist",
      "chapters": ".chapter-item, .chapters-list li",
      "chapterTitle": "a, .chapter-title",
      "chapterUrl": "a",
      "chapterDate": ".chapter-date, .date",
      "pageImages": ".manga-reader img, .page-image"
    }
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  config = EXCLUDED.config,
  updated_at = now();