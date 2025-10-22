import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeMangaRequest {
  url: string;
  jobType: "manga_info" | "chapters" | "pages" | "catalog";
  chapterId?: string;
  source?: string;
  limit?: number;
}

// User-Agent & TLS fingerprints
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Edg/131.0.0.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBaseHeaders(): HeadersInit {
  const ua = getRandomUserAgent();
  const headers: HeadersInit = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
  };
  return headers;
}

// Scraper configuration
const SCRAPER_CONFIGS: Record<string, any> = {
  "lekmanga": {
    baseUrl: "https://lekmanga.net",
    selectors: {
      title: "h1.entry-title, .post-title, h1.manga-title",
      cover: ".summary_image img, img.wp-post-image, .manga-cover img",
      description: ".summary__content, .description-summary .summary__content, .manga-excerpt",
      status: ".post-status .summary-content, .manga-status",
      genres: ".genres-content a, .manga-genres a",
      author: ".author-content, .manga-author",
      artist: ".artist-content, .manga-artist",
      chapters: "li.wp-manga-chapter, .chapter-item",
      chapterTitle: "a",
      chapterUrl: "a",
      chapterDate: ".chapter-release-date",
      pageImages: ".reading-content img, img.wp-manga-chapter-img, .page-break img"
    }
  },
  "azoramoon": {
    baseUrl: "https://azoramoon.com",
    selectors: {
      title: ".post-title h1, h1.entry-title",
      cover: ".summary_image img",
      description: ".manga-summary p, .summary__content p",
      status: ".post-status, .summary-content",
      genres: ".genres-content a",
      author: ".manga-authors, .author-content",
      artist: ".manga-artists, .artist-content",
      chapters: "li.wp-manga-chapter",
      chapterTitle: "a",
      chapterUrl: "a",
      chapterDate: ".chapter-release-date, .post-on",
      pageImages: ".reading-content img, .page-break img, img.wp-manga-chapter-img"
    }
  },
  "dilar": {
    baseUrl: "https://dilar.tube",
    selectors: {
      title: "h1.manga-title, .title",
      cover: ".manga-cover img, .cover img",
      description: ".manga-description, .description",
      status: ".manga-status, .status",
      genres: ".genres a, .tags a",
      author: ".author",
      artist: ".artist",
      chapters: ".chapter-item, .chapters li",
      chapterTitle: "a, .chapter-title",
      chapterUrl: "a",
      chapterDate: ".chapter-date, .date",
      pageImages: ".manga-page img, .page img"
    }
  },
  "onma": {
    baseUrl: "https://www.onma.top",
    selectors: {
      title: ".panel-heading",
      cover: "img.img-responsive",
      description: ".well p",
      status: ".label",
      genres: "h3:has-text('التصنيفات') .text a",
      author: "h3:has-text('المؤلف') .text a",
      artist: "h3:has-text('الرسام') .text a",
      chapters: "ul.chapters li",
      chapterTitle: ".chapter-title-rtl a",
      chapterUrl: ".chapter-title-rtl a",
      chapterDate: ".date-chapter-title-rtl",
      pageImages: ".img-responsive, .chapter-img",
      year: "h3:has-text('تاريخ الإصدار') .text",
      catalogMangaCard: ".photo",
      catalogMangaLink: ".manga-name a",
      catalogMangaCover: ".thumbnail img"
    }
  }
};

const MAX_RETRIES = 5;
const BASE_DELAY = 3000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(): Promise<void> {
  const baseDelay = getRandomDelay(2000, 5000);
  const jitter = getRandomDelay(-500, 500);
  await delay(baseDelay + jitter);
}

async function fetchWithRetry(url: string, config: any, retryCount = 0): Promise<string> {
  try {
    await humanDelay();
    const headers = getBaseHeaders();
    const response = await fetch(url, { method: 'GET', headers, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    if (html.length < 500) throw new Error('Response too short');
    return html;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const wait = BASE_DELAY * Math.pow(2, retryCount) + getRandomDelay(-1000, 1000);
      await delay(wait);
      return fetchWithRetry(url, config, retryCount + 1);
    }
    throw error;
  }
}

function tryMultipleSelectors(doc: any, selectors: string): string | null {
  const selectorList = selectors.split(',').map(s => s.trim());
  for (const selector of selectorList) {
    const el = doc.querySelector(selector);
    if (el) return el.textContent?.trim() || null;
  }
  return null;
}

function tryMultipleSelectorsForAttr(doc: any, selectors: string, attr: string): string | null {
  const selectorList = selectors.split(',').map(s => s.trim());
  for (const selector of selectorList) {
    const el = doc.querySelector(selector);
    if (el) return el.getAttribute(attr) || null;
  }
  return null;
}

function extractSlug(url: string): string {
  const match = url.match(/\/manga\/([^\/]+)/);
  return match ? match[1] : '';
}

// --- Scrape functions ---
async function scrapeMangaInfo(url: string, source = "lekmanga") {
  const config = SCRAPER_CONFIGS[source];
  const html = await fetchWithRetry(url, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  let title = tryMultipleSelectors(doc, config.selectors.title) || '';
  let cover = tryMultipleSelectorsForAttr(doc, config.selectors.cover, 'src') || '';
  if (cover && !cover.startsWith('http')) cover = config.baseUrl + cover;
  const description = tryMultipleSelectors(doc, config.selectors.description) || '';
  const statusRaw = tryMultipleSelectors(doc, config.selectors.status) || 'ongoing';
  const author = tryMultipleSelectors(doc, config.selectors.author) || '';
  const artist = tryMultipleSelectors(doc, config.selectors.artist) || '';
  const genres: string[] = Array.from(doc.querySelectorAll(config.selectors.genres)).map((el: any) => el.textContent?.trim()).filter(Boolean);
  const slug = extractSlug(url);

  return {
    title,
    slug,
    description,
    cover_url: cover,
    status: statusRaw.toLowerCase().includes('ongoing') ? 'ongoing' : 'completed',
    genres: genres.length > 0 ? genres : null,
    author: author || null,
    artist: artist || null,
    source_url: url,
    source,
  };
}

async function scrapeChapters(mangaUrl: string, source = "lekmanga") {
  const config = SCRAPER_CONFIGS[source];
  const html = await fetchWithRetry(mangaUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const chapters: any[] = [];
  const chapterEls = doc.querySelectorAll(config.selectors.chapters);
  chapterEls.forEach((ch: any, idx: number) => {
    const linkEl = ch.querySelector(config.selectors.chapterUrl);
    const titleEl = ch.querySelector(config.selectors.chapterTitle);
    const dateEl = ch.querySelector(config.selectors.chapterDate);
    if (!linkEl) return;
    let chapterNumber = parseFloat((titleEl?.textContent || '').match(/(\d+\.?\d*)/)?.[1] || (chapterEls.length - idx).toString());
    chapters.push({
      chapter_number: chapterNumber,
      title: titleEl?.textContent?.trim() || `Chapter ${chapterNumber}`,
      source_url: linkEl.getAttribute('href') || '',
      release_date: dateEl?.textContent?.trim() || null,
    });
  });
  return chapters;
}

async function scrapeChapterPages(chapterUrl: string, source = "lekmanga") {
  const config = SCRAPER_CONFIGS[source];
  const html = await fetchWithRetry(chapterUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const pages: any[] = [];
  const imgs = doc.querySelectorAll(config.selectors.pageImages);
  imgs.forEach((img: any, idx: number) => {
    let url = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (url && !url.includes('loading')) {
      if (url.startsWith('//')) url = 'https:' + url;
      else if (!url.startsWith('http')) url = config.baseUrl + url;
      pages.push({ page_number: idx + 1, image_url: url });
    }
  });
  return pages;
}

async function scrapeCatalog(source = "onma", limit = 20) {
  const config = SCRAPER_CONFIGS[source];
  const html = await fetchWithRetry(config.baseUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const mangaList: any[] = [];
  const cards = doc.querySelectorAll(config.selectors.catalogMangaCard || '.manga-item');
  for (let i = 0; i < Math.min(cards.length, limit); i++) {
    const card = cards[i];
    const linkEl = card.querySelector(config.selectors.catalogMangaLink || 'a');
    if (linkEl) mangaList.push({ url: linkEl.getAttribute('href') || '' });
  }
  return mangaList;
}

// --- Server ---
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url, jobType, chapterId, source = "lekmanga", limit = 20 } = await req.json() as ScrapeMangaRequest;

    if (!SCRAPER_CONFIGS[source]) throw new Error(`Unsupported source: ${source}`);

    let result: any;
    if (jobType === "manga_info") result = await scrapeMangaInfo(url, source);
    else if (jobType === "chapters") result = await scrapeChapters(url, source);
    else if (jobType === "pages" && chapterId) result = await scrapeChapterPages(url, source);
    else if (jobType === "catalog") result = await scrapeCatalog(source, limit);

    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
