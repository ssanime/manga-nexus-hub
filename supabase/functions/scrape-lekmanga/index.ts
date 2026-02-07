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

// Advanced User-Agents rotation with more realistic fingerprints
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/117.0.0.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBrowserHeaders(referer?: string): HeadersInit {
  const ua = getRandomUserAgent();
  const headers: HeadersInit = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': '1',
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  if (ua.includes('Chrome')) {
    headers['sec-ch-ua'] = '"Chromium";v="131", "Not_A Brand";v="24"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
  }

  return headers;
}

// Load scraper configuration from database or use defaults
async function loadScraperConfig(supabase: any, sourceName: string) {
  console.log(`[Config] Loading config for source: ${sourceName}`);
  
  try {
    // Try to load from database first
    const { data: source, error } = await supabase
      .from('scraper_sources')
      .select('*')
      .eq('name', sourceName.toLowerCase())
      .eq('is_active', true)
      .single();
    
    console.log(`[Config] DB Query - Error:`, error, 'Source:', source?.name);
    
    if (error) {
      console.log(`[Config] ⚠️ DB error or source not found:`, error.message);
    }
    
    if (source && !error) {
      console.log(`[Config] ✓ Loaded dynamic config for ${sourceName}`, source.base_url);
      
      // Convert database format to expected format
      const selectors = source.config?.selectors || {};
      const convertedSelectors: any = {};
      
      // Convert each selector to array format
      for (const [key, value] of Object.entries(selectors)) {
        if (typeof value === 'string') {
          convertedSelectors[key] = value.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(value)) {
          convertedSelectors[key] = value;
        } else {
          convertedSelectors[key] = [];
        }
      }
      
      console.log(`[Config] Converted selectors:`, Object.keys(convertedSelectors));
      
      return {
        baseUrl: source.base_url,
        selectors: convertedSelectors
      };
    }
  } catch (err: any) {
    console.error(`[Config] Exception loading config:`, err.message);
  }
  
  // Fallback to hardcoded configs
  console.log(`[Config] ⚠️ Using fallback config for ${sourceName}`);
  const FALLBACK_CONFIGS: Record<string, any> = {
    "onma": {
      baseUrl: "https://onma.me",
      selectors: {
        title: [".manga-name .label", ".panel-heading", "h1", ".title", ".manga-title"],
        cover: [".boxed img.img-responsive", ".thumbnail img", ".manga-cover img", "img[alt]"],
        description: [".well p", ".description", ".manga-description", ".summary"],
        status: [".label", ".status", ".manga-status"],
        genres: ["a[href*='genre']", ".genre a", ".tag a", ".category a"],
        author: ["a[href*='author']", ".author", ".manga-author"],
        artist: ["a[href*='artist']", ".artist", ".manga-artist"],
        chapters: ["ul.chapters li", ".chapter-item", ".chapter-list li", "li[class*='chapter']"],
        chapterTitle: [".chapter-title-rtl a", "a", ".chapter-name", ".chapter-title"],
        chapterUrl: [".chapter-title-rtl a", "a", ".chapter-link"],
        chapterDate: [".date-chapter-title-rtl", ".date", ".chapter-date", ".release-date"],
        pageImages: [".img-responsive", ".chapter-img", "img[alt*='page']", ".page-image", "img.lazy"],
        year: [".text", ".year", ".release-year"],
        catalogMangaCard: [".photo", ".span3", ".manga-card", ".item", ".manga-item"],
        catalogMangaLink: [".manga-name a", ".label", "a", ".title a", ".manga-link"],
        catalogMangaCover: [".thumbnail img", "img", ".cover img", ".manga-cover"]
      }
    },
    "dilar": {
      baseUrl: "https://dilar.tube",
      selectors: {
        title: [".manga-title", "h1", ".title", ".entry-title"],
        cover: [".manga-cover img", ".thumb img", "img.cover", "img"],
        description: [".manga-description", ".summary", ".description", "p"],
        status: [".status", ".manga-status"],
        genres: [".genre a", ".tag a", "a[href*='genre']"],
        author: [".author", ".manga-author"],
        artist: [".artist", ".manga-artist"],
        chapters: [".chapter-list li", ".chapters li", "li[class*='chapter']"],
        chapterTitle: [".chapter-num", "a", ".chapter-link"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-date", ".date"],
        pageImages: [".reader-content img", ".chapter-content img", "img.page", "img"],
        catalogMangaCard: [".manga-card", ".manga-item", ".card", "article"],
        catalogMangaLink: ["a[href*='manga']", "a"],
        catalogMangaCover: [".cover img", "img"]
      }
    },
    "lekmanga": {
      baseUrl: "https://lekmanga.net",
      selectors: {
        title: [".post-title h1", "h1", ".c-breadcrumb li:last-child a", ".entry-title"],
        cover: [".summary_image img", ".summary_image a img", "img.img-responsive", ".tab-summary img", "meta[property='og:image']"],
        description: [".summary__content p", ".description-summary .summary__content p", ".description-summary p", ".manga-excerpt"],
        status: [".post-status .post-content_item .summary-content", ".post-status .summary-content"],
        genres: [".genres-content a", ".tags-content a", "a[rel='tag']", ".mgen a"],
        author: [".author-content", ".post-content_item .author-content", "a[href*='manga-author']"],
        artist: [".artist-content", ".post-content_item .artist-content"],
        rating: ["#averagerate", ".score.font-meta.total_votes", "[property='ratingValue']", ".post-total-rating .score"],
        chapters: ["ul.main.version-chap li.wp-manga-chapter", "li.wp-manga-chapter", ".listing-chapters_wrap ul li", ".chapters-list li"],
        chapterTitle: ["a"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-release-date i", ".chapter-release-date", "span.chapter-release-date i"],
        // تحديث 2026: دعم أفضل لصور lekmanga
        pageImages: [
          ".reading-content img", 
          ".page-break img", 
          "img.wp-manga-chapter-img", 
          "#image-container img",
          "#readerarea img",
          ".entry-content img[src*='wp-content/uploads']",
          "img[data-src*='wp-content/uploads']",
          "img[src*='/manga/']"
        ],
        catalogMangaCard: [".page-item-detail", ".manga-item", ".c-tabs-item__content"],
        catalogMangaLink: ["a"],
        catalogMangaCover: ["img"]
      }
    },
    "azoramoon": {
      baseUrl: "https://azoramoon.com",
      selectors: {
        // معلومات المانجا - تحديث 2026
        title: [".post-title h1", "h1.entry-title", ".series-title", ".entry-title", "h1", "meta[property='og:title']"],
        cover: [".series-thumb img", ".summary_image img", "img.wp-post-image", ".thumb img", ".cover img", "meta[property='og:image']"],
        description: [".entry-content[itemprop='description'] p", ".series-synops", ".summary__content p", ".description", ".manga-description"],
        status: [".status .summary-content", ".series-status", ".spe span:last-child", ".manga-status"],
        genres: [".series-genres a", ".genres-content a", ".mgen a", "a[rel='tag']"],
        author: [".author-content", ".series-author", ".fmed b", ".author"],
        artist: [".artist-content", ".series-artist", ".artist"],
        rating: [".num[itemprop='ratingValue']", ".rating .num", ".series-rating", "[itemprop='ratingValue']"],
        // الفصول - تحديث 2026: هيكل جديد مع flex و items-center
        chapters: [
          "a.flex.w-full.items-center", // الهيكل الجديد: <a class="flex w-full items-center...">
          "a[href*='/chapter-']", // روابط الفصول
          ".eplister ul li", 
          "li.wp-manga-chapter", 
          ".chapter-item"
        ],
        chapterTitle: [
          ".text-xs.font-medium", // <span class="text-xs sm:text-sm font-medium">الفصل 15</span>
          "span.text-sm.font-medium",
          "a .chapternum", 
          ".chapternum",
          "a"
        ],
        chapterUrl: ["a[href*='/chapter-']", "a"],
        chapterDate: [
          "time[datetime]", // <time datetime="8 days">8 أيام</time>
          ".chapterdate", 
          ".chapter-release-date"
        ],
        // صور الفصل - تحديث 2026: data-image-index attribute
        pageImages: [
          "img[data-image-index]", // <img data-image-index="1" src="...">
          "img[src*='storage.azoramoon.com']", // الصور من storage
          "#readerarea img", 
          ".rdminimal img", 
          ".reading-content img", 
          "img.wp-manga-chapter-img"
        ],
        year: [".fmed:contains('Released') b", ".year", ".release-year"],
        catalogMangaCard: [".bs", ".bsx", ".listupd .bs", ".listupd article", ".page-item-detail"],
        catalogMangaLink: [".bsx a", "a[href*='/series/']", "a"],
        catalogMangaCover: [".limit img", "img"]
      }
    },
    "olympustaff": {
      baseUrl: "https://olympustaff.com",
      selectors: {
        title: [".author-info-title h1", ".series-title", "h1.text-white", "h1", ".manga-title"],
        cover: [".whitebox img.shadow-sm", ".series-thumb img", ".text-right img", "img[alt*='Manga']", ".cover img", "img.img-fluid"],
        description: [".review-content p", ".review-author-info", ".series-synops", ".description p", ".manga-description", ".summary p"],
        status: [".full-list-info small a[href*='status']", ".status-badge", ".status", ".manga-status"],
        genres: [".review-author-info a.subtitle", ".genres a", "a[href*='genre']", ".genre a", ".tag a"],
        author: [".full-list-info small a[href*='author']", ".author a", ".author"],
        artist: [".full-list-info small a[href*='artist']", ".artist a", ".artist"],
        rating: [".rating-avg-line", ".rating", ".score"],
        chapters: ["#chaptersContainer .chapter-card", ".enhanced-chapters-grid .chapter-card", ".chapter-card", ".last-chapter .box"],
        chapterTitle: [".chapter-title", ".chapter-number", ".chapter-info .chapter-number", "a"],
        chapterUrl: ["a.chapter-link", ".chapter-link", "a"],
        chapterDate: [".chapter-date span", ".chapter-date", ".date"],
        pageImages: [".page-break img", ".page-break.no-gaps img", "img.manga-chapter-img", "#image-0", ".reader-content img", ".chapter-images img"],
        year: [".year", ".release-year"],
        catalogMangaCard: [".entry-box", ".swiper-slide .entry-box", ".box", ".manga-card", ".series-card"],
        catalogMangaLink: [".entry-image a", ".entry-title a", "a[href*='series']", "a"],
        catalogMangaCover: [".entry-image img", ".best-img", ".imgu img", "img"]
      }
    },
    "3asq": {
      baseUrl: "https://3asq.org",
      selectors: {
        title: [".post-title h1", "h1.entry-title", ".manga-title", "h1"],
        cover: [".summary_image img", ".thumb img", "img.wp-post-image", ".tab-summary img", ".manga-cover img"],
        description: [".manga-excerpt p", ".summary__content p", ".description-summary p", ".entry-content p"],
        status: [".post-status .summary-content", ".post-content_item .summary-content", ".status"],
        genres: [".genres-content a", ".mgen a", "a[href*='manga-genre']", ".genre a"],
        author: [".author-content a", ".manga-author a", "a[href*='manga-author']"],
        artist: [".artist-content a", "a[href*='manga-artist']"],
        rating: [".score", ".rating .num", "[itemprop='ratingValue']"],
        chapters: ["li.wp-manga-chapter", "ul.main li.wp-manga-chapter", ".listing-chapters_wrap li", ".version-chap li"],
        chapterTitle: ["a", ".chapter-name"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-release-date i", ".chapter-release-date .timediff i", "span.chapter-release-date", ".release-date"],
        pageImages: ["img.wp-manga-chapter-img", ".reading-content img", ".page-break img", "#readerarea img"],
        year: ["a[href*='manga-release']", ".release-year"],
        catalogMangaCard: [".page-item-detail", ".c-tabs-item__content", ".manga-item", "article.post"],
        catalogMangaLink: [".item-thumb a", ".post-title a", "a[href*='/manga/']", "a"],
        catalogMangaCover: [".item-thumb img", "img.wp-post-image", "img"]
      }
    },
    // NEW: Lavatoons.com - تحديث 2026 مع ch-main-anchor و ts-main-image curdown
    "lavatoons": {
      baseUrl: "https://lavatoons.com",
      selectors: {
        // معلومات المانجا - Madara Theme
        title: [".post-title h1", "h1", ".entry-title", ".manga-title", "meta[property='og:title']"],
        cover: [".summary_image img", ".summary_image a img", "img.img-responsive", ".tab-summary img", "meta[property='og:image']"],
        description: [".description-summary .summary__content", ".manga-excerpt", ".summary__content p", ".entry-content p"],
        status: [".post-content_item:contains('الحالة') .summary-content", ".post-status .summary-content", ".status"],
        genres: [".genres-content a", ".tags-content a", "a[rel='tag']", ".mgen a"],
        author: [".author-content a", ".author-content", "a[href*='manga-author']"],
        artist: [".artist-content a", ".artist-content", "a[href*='manga-artist']"],
        rating: [".score", ".post-total-rating .score", "[property='ratingValue']", "#averagerate"],
        // قائمة الفصول - تحديث 2026: ch-main-anchor style
        chapters: [
          "a.ch-main-anchor", // الهيكل الجديد: <a href="..." class="ch-main-anchor">
          "#chapterlist ul li[data-num]", 
          ".eplister ul li[data-num]", 
          ".eplister ul li", 
          "li.wp-manga-chapter"
        ],
        chapterTitle: [
          ".ch-num", // <span class="ch-num">فصل 125</span>
          "span.chapternum", 
          ".chapternum", 
          "a"
        ],
        chapterUrl: ["a.ch-main-anchor", "a"],
        chapterDate: [
          ".ch-date", // <span class="ch-date">2025/12/22</span>
          "span.chapterdate", 
          ".chapterdate", 
          ".chapter-release-date"
        ],
        // صور الفصل - تحديث 2026: ts-main-image curdown with data-index
        pageImages: [
          "img.ts-main-image.curdown", // <img class="ts-main-image curdown" data-index="1" src="...">
          "img.ts-main-image[data-index]",
          "img[data-server]", // img with data-server attribute
          "#readerarea img.ts-main-image", 
          "#readerarea img", 
          "img.ts-main-image", 
          ".reading-content img", 
          ".page-break img"
        ],
        year: [".post-content_item:contains('السنة') .summary-content", ".release-year"],
        // الكتالوج
        catalogMangaCard: [".page-item-detail", ".manga-item", ".c-tabs-item__content", "article.post"],
        catalogMangaLink: [".item-thumb a", ".post-title a", "a"],
        catalogMangaCover: [".item-thumb img", "img", ".summary_image img"]
      }
    },
    // Alternative lavatoons entry for domain variations
    "lavatoons.com": {
      baseUrl: "https://lavatoons.com",
      selectors: {
        title: [".post-title h1", "h1", ".entry-title", ".manga-title"],
        cover: [".summary_image img", ".summary_image a img", "img.img-responsive", ".tab-summary img"],
        description: [".description-summary .summary__content", ".manga-excerpt", ".summary__content p"],
        status: [".post-content_item:contains('الحالة') .summary-content", ".post-status .summary-content"],
        genres: [".genres-content a", ".tags-content a", "a[rel='tag']"],
        author: [".author-content a", ".author-content"],
        artist: [".artist-content a", ".artist-content"],
        rating: [".score", ".post-total-rating .score", "[property='ratingValue']"],
        chapters: ["a.ch-main-anchor", "#chapterlist ul li[data-num]", ".eplister ul li[data-num]", "li.wp-manga-chapter"],
        chapterTitle: [".ch-num", "span.chapternum", ".chapternum", "a"],
        chapterUrl: ["a.ch-main-anchor", "a"],
        chapterDate: [".ch-date", "span.chapterdate", ".chapterdate", ".chapter-release-date i"],
        pageImages: ["img.ts-main-image.curdown", "img.ts-main-image[data-index]", "#readerarea img.ts-main-image", "#readerarea img", "img.ts-main-image", ".reading-content img"],
        catalogMangaCard: [".page-item-detail", ".manga-item"],
        catalogMangaLink: [".item-thumb a", ".post-title a"],
        catalogMangaCover: [".item-thumb img", "img"]
      }
    },
    // lavascans.com - نفس lavatoons
    "lavascans": {
      baseUrl: "https://lavascans.com",
      selectors: {
        title: [".post-title h1", "h1", ".entry-title", ".manga-title"],
        cover: [".summary_image img", ".summary_image a img", "img.img-responsive", ".tab-summary img"],
        description: [".description-summary .summary__content", ".manga-excerpt", ".summary__content p"],
        status: [".post-content_item:contains('الحالة') .summary-content", ".post-status .summary-content"],
        genres: [".genres-content a", ".tags-content a", "a[rel='tag']"],
        author: [".author-content a", ".author-content"],
        artist: [".artist-content a", ".artist-content"],
        rating: [".score", ".post-total-rating .score", "[property='ratingValue']"],
        chapters: ["a.ch-main-anchor", "#chapterlist ul li[data-num]", ".eplister ul li[data-num]", "li.wp-manga-chapter"],
        chapterTitle: [".ch-num", "span.chapternum", ".chapternum", "a"],
        chapterUrl: ["a.ch-main-anchor", "a"],
        chapterDate: [".ch-date", "span.chapterdate", ".chapterdate", ".chapter-release-date i"],
        pageImages: ["img.ts-main-image.curdown", "img.ts-main-image[data-index]", "#readerarea img.ts-main-image", "#readerarea img", "img.ts-main-image", ".reading-content img"],
        catalogMangaCard: [".page-item-detail", ".manga-item"],
        catalogMangaLink: [".item-thumb a", ".post-title a"],
        catalogMangaCover: [".item-thumb img", "img"]
      }
    },
    // NEW: MeshManga.com - Arabic manga site with custom layout
    "meshmanga": {
      baseUrl: "https://meshmanga.com",
      selectors: {
        // معلومات المانجا
        title: ["h1", ".series-title", ".manga-title", "meta[property='og:title']"],
        cover: ["img.series-cover", ".cover img", "meta[property='og:image']", "img[alt]"],
        description: [".description", ".synopsis", "meta[property='og:description']", "p"],
        status: [".status", ".manga-status"],
        genres: [".genre a", ".tag a", "a[href*='genre']"],
        author: [".author", ".manga-author"],
        artist: [".artist", ".manga-artist"],
        rating: [".rating", ".score"],
        // الفصول - نمط: الفصل: XX
        chapters: [".chapter-item", ".chapter-list > div", "div[class*='chapter']"],
        chapterTitle: ["a", ".chapter-title"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-date", ".date", "span"],
        // صور الفصل - من appswat.com CDN
        pageImages: [".flex-col img.w-full", "img.w-full.h-auto", "img[src*='appswat.com']", "img[src*='/v2/media/series/']"],
        catalogMangaCard: [".series-card", ".manga-card", "article"],
        catalogMangaLink: ["a[href*='/series/']", "a"],
        catalogMangaCover: ["img"]
      }
    },
    "meshmanga.com": {
      baseUrl: "https://meshmanga.com",
      selectors: {
        title: ["h1", ".series-title", ".manga-title", "meta[property='og:title']"],
        cover: ["img.series-cover", ".cover img", "meta[property='og:image']", "img[alt]"],
        description: [".description", ".synopsis", "meta[property='og:description']", "p"],
        status: [".status", ".manga-status"],
        genres: [".genre a", ".tag a", "a[href*='genre']"],
        author: [".author", ".manga-author"],
        artist: [".artist", ".manga-artist"],
        rating: [".rating", ".score"],
        chapters: [".chapter-item", ".chapter-list > div", "div[class*='chapter']"],
        chapterTitle: ["a", ".chapter-title"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-date", ".date", "span"],
        pageImages: [".flex-col img.w-full", "img.w-full.h-auto", "img[src*='appswat.com']", "img[src*='/v2/media/series/']"],
        catalogMangaCard: [".series-card", ".manga-card", "article"],
        catalogMangaLink: ["a[href*='/series/']", "a"],
        catalogMangaCover: ["img"]
      }
    }
  };
  
  return FALLBACK_CONFIGS[sourceName.toLowerCase()] || null;
}

const MAX_RETRIES = 5; // Increased retries for aggressive mode
const BASE_DELAY = 2000;
const CLOUDFLARE_RETRY_DELAY = 5000;
const FETCH_TIMEOUT = 35000; // 35 seconds
const FUNCTION_TIMEOUT = 55000; // 55 seconds max execution

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(): Promise<void> {
  await delay(getRandomDelay(800, 2000));
}

// Check if HTML is Cloudflare challenge page - STRICT
function isCloudflareChallengePage(html: string): boolean {
  if (!html || html.length === 0) return true;
  
  const lowerHtml = html.toLowerCase();
  
  const criticalIndicators = [
    'just a moment',
    'checking your browser',
    'cf-browser-verification',
    '__cf_chl_',
    'cf_chl_opt',
    'turnstile',
    'enable javascript and cookies',
    'attention required',
    'verifying you are human',
    'please wait while we',
  ];
  
  for (const indicator of criticalIndicators) {
    if (lowerHtml.includes(indicator)) {
      return true;
    }
  }
  
  // Short response with CF markers
  if (html.length < 5000 && (lowerHtml.includes('cloudflare') || lowerHtml.includes('cf-ray'))) {
    return true;
  }
  
  return false;
}

// Enhanced Firecrawl direct integration for aggressive scraping
async function useFirecrawlDirect(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1') || Deno.env.get('FIRECRAWL');
  
  if (!apiKey) {
    console.log('[Firecrawl] API key not configured');
    return null;
  }
  
  console.log('[Firecrawl] 🔥 Attempting direct Firecrawl scrape...');
  
  const configs = [
    { waitFor: 8000, timeout: 90 },
    { waitFor: 15000, timeout: 120 },
  ];
  
  for (const config of configs) {
    try {
      console.log(`[Firecrawl] Attempt with waitFor=${config.waitFor}ms`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['html', 'rawHtml'],
          waitFor: config.waitFor,
          timeout: config.timeout,
          onlyMainContent: false,
          skipTlsVerification: true,
          location: { country: 'SA', languages: ['ar', 'en'] },
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const html = data.data?.rawHtml || data.data?.html;
        
        if (html && html.length > 5000 && !isCloudflareChallengePage(html)) {
          console.log(`[Firecrawl] ✓ Success: ${html.length} bytes`);
          return html;
        }
      }
      
      await delay(2000);
    } catch (e: any) {
      console.log(`[Firecrawl] Error:`, e?.message);
    }
  }
  
  return null;
}

// Smart HTML fetcher with enhanced anti-bot evasion and Cloudflare bypass integration
async function fetchHTML(url: string, config: any, retryCount = 0): Promise<string> {
  try {
    console.log(`[Fetch] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}: ${url}`);
    
    // For first attempt, try Firecrawl directly (most reliable for protected sites)
    if (retryCount === 0) {
      const firecrawlHtml = await useFirecrawlDirect(url);
      if (firecrawlHtml) {
        return firecrawlHtml;
      }
    }
    
    // Human-like delay
    await delay(getRandomDelay(1500, 4000));
    
    const headers = getBrowserHeaders(retryCount > 0 ? url : undefined);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(`[Fetch] Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);
    
    if (!response.ok) {
      if (response.status === 403 || response.status === 503) {
        console.error(`[Fetch] ${response.status} - Trying enhanced bypass...`);
        throw new Error('CLOUDFLARE_BLOCK');
      }
      if (response.status === 522 || response.status === 524) {
        throw new Error(`TIMEOUT_${response.status}`);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Strict Cloudflare detection
    if (isCloudflareChallengePage(html)) {
      console.error(`[Fetch] Cloudflare challenge detected!`);
      throw new Error('CLOUDFLARE_CHALLENGE');
    }
    
    // Check for actual content
    if (html.length < 3000) {
      console.error(`[Fetch] Response too short: ${html.length} bytes`);
      throw new Error('EMPTY_RESPONSE');
    }
    
    console.log(`[Fetch] ✓ Success: ${html.length} bytes`);
    return html;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[Fetch] Error on attempt ${retryCount + 1}:`, errorMsg);
    
    // Try enhanced bypass for Cloudflare errors
    if ((errorMsg.includes('CLOUDFLARE') || errorMsg === 'CLOUDFLARE_BLOCK' || errorMsg === 'CLOUDFLARE_CHALLENGE') && retryCount < 2) {
      console.log('[Fetch] 🛡️ Attempting enhanced bypass via edge function...');
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        const bypassResponse = await fetch(`${supabaseUrl}/functions/v1/cloudflare-bypass`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ 
            url, 
            aggressive: true,
            retries: 6 
          }),
        });
        
        const bypassData = await bypassResponse.json();
        
        if (bypassData.success && bypassData.html) {
          // Verify the content is not a challenge page
          if (!isCloudflareChallengePage(bypassData.html) && bypassData.html.length > 5000) {
            console.log(`[Fetch] ✓ Enhanced bypass successful via ${bypassData.method}!`);
            return bypassData.html;
          } else {
            console.error('[Fetch] Bypass returned invalid content');
          }
        } else {
          console.error('[Fetch] Bypass failed:', bypassData.error);
        }
      } catch (bypassError: any) {
        console.error('[Fetch] Bypass exception:', bypassError?.message);
      }
    }
    
    // Handle AbortError (timeout)
    if (error.name === 'AbortError') {
      console.error(`[Fetch] Request timeout after ${FETCH_TIMEOUT}ms`);
      if (retryCount < MAX_RETRIES) {
        const delayMs = BASE_DELAY * Math.pow(1.5, retryCount) + getRandomDelay(1000, 3000);
        await delay(delayMs);
        return fetchHTML(url, config, retryCount + 1);
      }
      throw new Error('REQUEST_TIMEOUT');
    }
    
    // Retry for other errors
    if (retryCount < MAX_RETRIES) {
      let delayMs = BASE_DELAY * Math.pow(1.5, retryCount) + getRandomDelay(1000, 2500);
      
      if (errorMsg.includes('CLOUDFLARE')) {
        delayMs = CLOUDFLARE_RETRY_DELAY + getRandomDelay(2000, 5000);
      }
      
      console.log(`[Fetch] ⏳ Retrying after ${delayMs}ms...`);
      await delay(delayMs);
      return fetchHTML(url, config, retryCount + 1);
    }
    
    // Final error
    if (errorMsg.includes('CLOUDFLARE')) {
      throw new Error('CLOUDFLARE_PROTECTION');
    } else if (errorMsg.includes('TIMEOUT')) {
      throw new Error('REQUEST_TIMEOUT');
    }
    
    throw error;
  }
}

// Smart selector matcher - tries multiple selectors and finds best match
function smartSelect(doc: any, selectors: string[], type: 'text' | 'attr' = 'text', attr = 'src'): string | null {
  // Handle both array and single string selectors
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  
  for (const selector of selectorList) {
    try {
      const element = doc.querySelector(selector);
      if (element) {
        if (type === 'text') {
          const text = element.textContent?.trim();
          if (text && text.length > 0) {
            console.log(`[Smart] Found with selector: ${selector} -> "${text.substring(0, 50)}..."`);
            return text;
          }
        } else {
          // Try multiple attributes
          const value = element.getAttribute(attr) || 
                       element.getAttribute('data-' + attr) ||
                       element.getAttribute('data-src') ||
                       element.getAttribute('data-lazy-src') ||
                       element.getAttribute('data-original');
          if (value) {
            console.log(`[Smart] Found ${attr} with selector: ${selector}`);
            return value;
          }
        }
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  // Extended fallback search for common patterns
  if (type === 'text') {
    // Try common title patterns
    const fallbackSelectors = ['h1', '.post-title', '.entry-title', '.manga-title', '.series-title', 'title'];
    for (const fallback of fallbackSelectors) {
      if (!selectorList.includes(fallback)) {
        try {
          const el = doc.querySelector(fallback);
          if (el) {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 200) {
              console.log(`[Smart] Fallback found with: ${fallback}`);
              return text;
            }
          }
        } catch (e) {}
      }
    }
  }
  
  return null;
}

// Smart genre extractor with text search
function smartExtractGenres(doc: any, selectors: string[]): string[] {
  const genres: string[] = [];
  
  // Try configured selectors first
  for (const selector of selectors) {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el: any) => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 50) {
          genres.push(text);
        }
      });
      if (genres.length > 0) break;
    } catch (e) {}
  }
  
  // Fallback: search for common genre patterns
  if (genres.length === 0) {
    try {
      const allLinks = doc.querySelectorAll('a');
      allLinks.forEach((link: any) => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim() || '';
        if ((href.includes('genre') || href.includes('tag') || href.includes('category')) && text) {
          genres.push(text);
        }
      });
    } catch (e) {}
  }
  
  return [...new Set(genres)]; // Remove duplicates
}

// Convert Arabic date to ISO format
function parseArabicDate(dateText: string): string | null {
  if (!dateText) return null;
  
  // Map Arabic months to numbers
  const arabicMonths: { [key: string]: number } = {
    'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4,
    'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8,
    'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
  };
  
  // Try to parse Arabic date format: "أكتوبر 4, 2025" or "4 أكتوبر 2025"
  for (const [month, num] of Object.entries(arabicMonths)) {
    if (dateText.includes(month)) {
      const numbers = dateText.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const day = numbers[0];
        const year = numbers[1];
        // Return ISO format: YYYY-MM-DD
        return `${year}-${String(num).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  
  // Try standard date formats
  const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return dateMatch[0];
  }
  
  // Fallback: return current date
  console.log(`[Date] Could not parse date: ${dateText}, using current date`);
  return new Date().toISOString().split('T')[0];
}

function extractSlug(url: string): string {
  // Support multiple URL patterns: /manga/, /series/, /comic/, /webtoon/
  const patterns = [
    /\/manga\/([^\/\?#]+)/,
    /\/series\/([^\/\?#]+)/,
    /\/comic\/([^\/\?#]+)/,
    /\/webtoon\/([^\/\?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      console.log(`[Slug] Extracted from URL: ${match[1]}`);
      return match[1];
    }
  }
  
  // Fallback: use the last part of the path
  const pathParts = url.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  console.log(`[Slug] Fallback slug: ${lastPart}`);
  return lastPart || 'unknown';
}

// Clean URL by removing whitespace, tabs, and newlines
function cleanUrl(url: string): string {
  // Also handle JSON-escaped URLs like https:\/\/example.com\/path
  return url
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/[\s\t\n\r]+/g, '')
    .trim();
}

async function scrapeMangaInfo(url: string, source: string, supabase: any) {
  console.log(`[Manga Info] 📖 Starting scrape from ${source.toUpperCase()}: ${url}`);
  
  const config = await loadScraperConfig(supabase, source);
  if (!config) throw new Error(`Unknown source: ${source}. Please add it in Sources Manager first.`);

  const html = await fetchHTML(url, config);
  
  // Debug: Log HTML length and sample
  console.log(`[Manga Info] HTML received: ${html.length} bytes`);
  console.log(`[Manga Info] HTML sample: ${html.substring(0, 500)}`);
  
  // CRITICAL: Check if we got Cloudflare page instead of real content
  const lowerHtml = html.toLowerCase();
  const cloudflareIndicators = [
    'just a moment',
    'checking your browser',
    'cf-browser-verification',
    'please wait while we',
    'ddos protection',
    'attention required',
  ];
  
  const isCloudfarePage = cloudflareIndicators.some(ind => lowerHtml.includes(ind));
  
  if (isCloudfarePage) {
    console.error('[Manga Info] ❌ CRITICAL: Received Cloudflare challenge page instead of manga content!');
    console.error('[Manga Info] HTML snippet:', html.substring(0, 1000));
    throw new Error('CLOUDFLARE_CHALLENGE: تم حظر الطلب بواسطة Cloudflare. يرجى التأكد من إعداد FlareSolverr أو CloudProxy بشكل صحيح.');
  }
  
  // Also check for very short responses
  if (html.length < 3000) {
    console.error('[Manga Info] ❌ Response too short, likely blocked:', html.length, 'bytes');
    throw new Error('BLOCKED_RESPONSE: الرد قصير جداً، ربما تم حظر الطلب.');
  }
  
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  // Enhanced title extraction with multiple fallbacks
  let title = smartSelect(doc, config.selectors.title || [], 'text') || '';
  
  // Fallback title extraction
  if (!title || title.length < 2) {
    console.log('[Manga Info] Title not found, trying fallbacks...');
    
    // Try meta og:title
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      title = ogTitle.getAttribute('content') || '';
      console.log(`[Manga Info] Found og:title: ${title}`);
    }
    
    // Try document title
    if (!title || title.length < 2) {
      const docTitle = doc.querySelector('title');
      if (docTitle) {
        title = docTitle.textContent?.split('|')[0]?.split('-')[0]?.trim() || '';
        console.log(`[Manga Info] Found document title: ${title}`);
      }
    }
    
    // Try h1, h2
    if (!title || title.length < 2) {
      for (const tag of ['h1', 'h2']) {
        const el = doc.querySelector(tag);
        if (el) {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) {
            title = text;
            console.log(`[Manga Info] Found ${tag}: ${title}`);
            break;
          }
        }
      }
    }
  }
  
  // Enhanced cover extraction
  let cover = smartSelect(doc, config.selectors.cover || [], 'attr', 'src') || '';
  
  // Fallback cover extraction
  if (!cover) {
    console.log('[Manga Info] Cover not found, trying fallbacks...');
    
    // Try og:image
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      cover = ogImage.getAttribute('content') || '';
      console.log(`[Manga Info] Found og:image: ${cover}`);
    }
    
    // Try common cover selectors
    if (!cover) {
      const coverSelectors = [
        'img.wp-post-image', '.thumb img', '.cover img', 
        '.summary_image img', 'img[itemprop="image"]',
        '.post-thumbnail img', '.series-thumb img'
      ];
      for (const sel of coverSelectors) {
        const el = doc.querySelector(sel);
        if (el) {
          cover = el.getAttribute('src') || el.getAttribute('data-src') || 
                  el.getAttribute('data-lazy-src') || el.getAttribute('data-original') || '';
          if (cover) {
            console.log(`[Manga Info] Found cover with: ${sel}`);
            break;
          }
        }
      }
    }
  }
  
  if (cover && !cover.startsWith('http')) {
    cover = cover.startsWith('//') ? 'https:' + cover : config.baseUrl + cover;
  }
  cover = cleanUrl(cover);
  
  // Enhanced description extraction
  let description = '';
  const descSelectors = config.selectors.description || [];
  for (const selector of (Array.isArray(descSelectors) ? descSelectors : [descSelectors])) {
    const el = doc.querySelector(selector);
    if (el) {
      description = el.textContent?.trim() || '';
      if (description && description.length > 20) {
        console.log(`[Manga Info] Found description with: ${selector}`);
        break;
      }
    }
  }
  
  // Fallback description
  if (!description || description.length < 20) {
    // Try meta description
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc) {
      description = metaDesc.getAttribute('content') || '';
      console.log(`[Manga Info] Found meta description`);
    }
    
    // Try og:description
    if (!description || description.length < 20) {
      const ogDesc = doc.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        description = ogDesc.getAttribute('content') || '';
        console.log(`[Manga Info] Found og:description`);
      }
    }
    
    // Try common description selectors
    if (!description || description.length < 20) {
      const descFallbacks = [
        '.summary__content', '.description', '.manga-excerpt', 
        '[itemprop="description"]', '.entry-content', '.synopsis'
      ];
      for (const sel of descFallbacks) {
        const el = doc.querySelector(sel);
        if (el) {
          const text = el.textContent?.trim();
          if (text && text.length > 20) {
            description = text;
            console.log(`[Manga Info] Found description fallback with: ${sel}`);
            break;
          }
        }
      }
    }
  }
  
  if (!description || description.length < 10) {
    description = 'لا يوجد وصف متاح';
  }
  
  console.log(`[Manga Info] Description extracted: ${description.substring(0, 100)}...`);
  
  const statusRaw = smartSelect(doc, config.selectors.status || [], 'text') || 'ongoing';
  const author = smartSelect(doc, config.selectors.author || [], 'text') || 'غير معروف';
  const artist = smartSelect(doc, config.selectors.artist || [], 'text') || '';
  
  // Try to extract rating
  let rating = 0;
  if (config.selectors.rating) {
    const ratingText = smartSelect(doc, config.selectors.rating, 'text');
    if (ratingText) {
      const ratingMatch = ratingText.match(/[\d.]+/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[0]);
        console.log(`[Manga Info] Rating extracted: ${rating}`);
      }
    }
  }
  
  let year = null;
  if (config.selectors.year) {
    const yearText = smartSelect(doc, config.selectors.year, 'text');
    if (yearText) {
      const match = yearText.match(/\d{4}/);
      if (match) year = parseInt(match[0]);
    }
  }

  const genres = smartExtractGenres(doc, config.selectors.genres || []);
  const slug = extractSlug(url);
  
  // Download and upload cover image to storage
  let uploadedCoverUrl = cover;
  if (cover) {
    const coverFileName = `covers/${slug}-${Date.now()}.jpg`;
    const uploadedCover = await downloadAndUploadImage(cover, supabase, 'manga-covers', coverFileName);
    if (uploadedCover) {
      uploadedCoverUrl = uploadedCover;
      console.log(`[Manga Info] ✓ Cover uploaded to storage`);
    }
  }

  const mangaData = {
    title: title || 'بدون عنوان',
    slug,
    description,
    cover_url: uploadedCoverUrl,
    status: (statusRaw.toLowerCase().includes('ongoing') || statusRaw.includes('مستمر')) ? 'ongoing' : 'completed',
    genres: genres.length > 0 ? genres : null,
    author: author || null,
    artist: artist || null,
    rating: rating > 0 ? rating : null,
    year,
    source_url: url,
    source,
  };

  console.log(`[Manga Info] ✅ Success:`, { 
    title: mangaData.title, 
    genres: genres.length, 
    cover: !!uploadedCoverUrl,
    description: description.substring(0, 50)
  });
  return mangaData;
}

async function scrapeChapters(mangaUrl: string, source: string, supabase: any) {
  console.log(`[Chapters] 📚 Starting scrape from ${source.toUpperCase()}: ${mangaUrl}`);
  
  const config = await loadScraperConfig(supabase, source);
  if (!config) throw new Error(`Unknown source: ${source}. Please add it in Sources Manager first.`);

  const html = await fetchHTML(mangaUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const chapters: any[] = [];
  
  // Special handling for olympustaff - extract chapter range from lastend section
  const sourceLower = source.toLowerCase();
  if (sourceLower === 'olympustaff') {
    console.log(`[Chapters] Using olympustaff chapter generation method`);
    
    // Extract first and last chapter numbers from lastend links
    const firstChapterLink = doc.querySelector('.lastend .inepcx:first-child a');
    const lastChapterLink = doc.querySelector('.lastend .inepcx:last-child a');
    
    let firstChapterNum = 0;
    let lastChapterNum = 0;
    
    // Get chapter count from header
    const chapterCountEl = doc.querySelector('.chapter-controls h5, .nav-link#chapter-contact-tab');
    if (chapterCountEl) {
      const countMatch = chapterCountEl.textContent?.match(/\((\d+)\)/);
      if (countMatch) {
        console.log(`[Chapters] Total chapters from header: ${countMatch[1]}`);
      }
    }
    
    // Extract first chapter number
    if (firstChapterLink) {
      const href = firstChapterLink.getAttribute('href') || '';
      const match = href.match(/\/(\d+\.?\d*)\/?$/);
      if (match) firstChapterNum = parseFloat(match[1]);
      console.log(`[Chapters] First chapter: ${firstChapterNum}`);
    }
    
    // Extract last chapter number
    if (lastChapterLink) {
      const href = lastChapterLink.getAttribute('href') || '';
      const match = href.match(/\/(\d+\.?\d*)\/?$/);
      if (match) lastChapterNum = parseFloat(match[1]);
      console.log(`[Chapters] Last chapter: ${lastChapterNum}`);
    }
    
    // Also get chapters from the visible chapter cards
    const visibleChapters = doc.querySelectorAll('.chapter-card');
    const visibleChapterNums = new Set<number>();
    
    visibleChapters.forEach((chapterEl: any) => {
      const dataNumber = chapterEl.getAttribute('data-number');
      if (dataNumber) {
        visibleChapterNums.add(parseFloat(dataNumber));
        const chapterUrl = chapterEl.querySelector('a.chapter-link')?.getAttribute('href') || '';
        const title = chapterEl.querySelector('.chapter-title')?.textContent?.trim() || '';
        const dataDate = chapterEl.getAttribute('data-date');
        let releaseDate = null;
        if (dataDate) {
          const timestamp = parseInt(dataDate);
          if (timestamp > 0) {
            releaseDate = new Date(timestamp * 1000).toISOString().split('T')[0];
          }
        }
        
        chapters.push({
          chapter_number: parseFloat(dataNumber),
          title: title || `الفصل ${dataNumber}`,
          source_url: chapterUrl,
          release_date: releaseDate,
        });
      }
    });
    
    console.log(`[Chapters] Found ${visibleChapters.length} visible chapters`);
    
    // Generate missing chapters based on range
    if (lastChapterNum > firstChapterNum) {
      const baseUrl = mangaUrl.replace(/\/$/, '');
      
      for (let i = Math.floor(firstChapterNum); i <= Math.ceil(lastChapterNum); i++) {
        if (!visibleChapterNums.has(i)) {
          chapters.push({
            chapter_number: i,
            title: `الفصل ${i}`,
            source_url: `${baseUrl}/${i}`,
            release_date: null,
          });
        }
      }
      
      console.log(`[Chapters] Generated ${chapters.length} total chapters (${firstChapterNum} to ${lastChapterNum})`);
    }
    
    // Sort chapters by number
    chapters.sort((a, b) => a.chapter_number - b.chapter_number);
    console.log(`[Chapters] Success: ${chapters.length} chapters for olympustaff`);
    return chapters;
  }
  
  // Special handling for azoramoon - تحديث 2026: flex w-full items-center structure
  const isAzoramoon = sourceLower === 'azoramoon' || sourceLower === 'azoramoon.com' || mangaUrl.includes('azoramoon.com');
  if (isAzoramoon) {
    console.log(`[Chapters] Using azoramoon 2026 chapter extraction method`);
    
    // الهيكل الجديد: <a class="flex w-full items-center..." href="/series/.../chapter-15">
    const azoramoonSelectors = [
      'a.flex.w-full.items-center[href*="/chapter"]',
      'a[href*="/chapter-"]',
      'a[href*="/series/"][href*="/chapter"]',
      '.eplister ul li a'
    ];
    
    for (const selector of azoramoonSelectors) {
      const chapterElements = doc.querySelectorAll(selector);
      if (chapterElements.length > 0) {
        console.log(`[Chapters] Found ${chapterElements.length} chapters with: ${selector}`);
        
        for (let i = 0; i < chapterElements.length; i++) {
          const chapterEl = chapterElements[i] as any;
          try {
            // Get URL from href
            let chapterUrl = chapterEl.getAttribute('href') || '';
            
            if (!chapterUrl || !chapterUrl.includes('chapter')) {
              continue;
            }
            
            // Extract chapter number from URL: /chapter-15 or /chapter/15
            let chapterNumber = 0;
            const urlMatch = chapterUrl.match(/chapter[_-]?(\d+\.?\d*)/i);
            if (urlMatch) {
              chapterNumber = parseFloat(urlMatch[1]);
            }
            
            // Get title from .text-xs.font-medium or similar
            let title = '';
            const titleEl = chapterEl.querySelector('.text-xs.font-medium, .text-sm.font-medium, span[class*="font-medium"]');
            if (titleEl) {
              title = titleEl.textContent?.trim() || '';
            }
            
            // Extract chapter number from title if not from URL
            if (chapterNumber === 0 && title) {
              const numMatch = title.match(/(\d+\.?\d*)/);
              if (numMatch) {
                chapterNumber = parseFloat(numMatch[1]);
              }
            }
            
            // Get date from <time datetime="...">
            let dateText = '';
            const timeEl = chapterEl.querySelector('time[datetime]');
            if (timeEl) {
              dateText = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || '';
            }
            
            // Parse relative date (e.g., "8 days" or "8 أيام")
            let releaseDate = null;
            if (dateText) {
              // Try to parse "X days" format
              const daysMatch = dateText.match(/(\d+)\s*(?:days?|أيام|يوم)/i);
              if (daysMatch) {
                const daysAgo = parseInt(daysMatch[1]);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                releaseDate = date.toISOString().split('T')[0];
              } else {
                releaseDate = parseArabicDate(dateText);
              }
            }
            
            // Normalize URL
            if (!chapterUrl.startsWith('http')) {
              if (chapterUrl.startsWith('//')) {
                chapterUrl = 'https:' + chapterUrl;
              } else if (chapterUrl.startsWith('/')) {
                chapterUrl = 'https://azoramoon.com' + chapterUrl;
              } else {
                chapterUrl = 'https://azoramoon.com/' + chapterUrl;
              }
            }
            
            // Avoid duplicates
            const exists = chapters.some(c => c.chapter_number === chapterNumber);
            if (!exists && chapterNumber > 0) {
              chapters.push({
                chapter_number: chapterNumber,
                title: title || `الفصل ${chapterNumber}`,
                source_url: chapterUrl,
                release_date: releaseDate,
              });
              
              console.log(`[Chapters] ✓ Chapter ${chapterNumber}: ${title?.substring(0, 30) || 'N/A'}`);
            }
          } catch (e: any) {
            console.error(`[Chapters] Error processing azoramoon chapter ${i + 1}:`, e?.message || e);
          }
        }
        
        if (chapters.length > 0) break;
      }
    }
    
    if (chapters.length > 0) {
      chapters.sort((a, b) => a.chapter_number - b.chapter_number);
      console.log(`[Chapters] Success: ${chapters.length} chapters for azoramoon`);
      return chapters;
    }
    
    console.log(`[Chapters] ⚠️ No azoramoon chapters found, trying standard selectors...`);
  }
  
  // Special handling for lavatoons - تحديث 2026: ch-main-anchor structure
  if (sourceLower === 'lavatoons' || sourceLower === 'lavatoons.com' || sourceLower === 'lavascans' || mangaUrl.includes('lavatoons.com') || mangaUrl.includes('lavascans.com')) {
    console.log(`[Chapters] Using lavatoons 2026 chapter extraction method`);
    
    // الهيكل الجديد: <a href="..." class="ch-main-anchor">
    const lavatoonsSelectors = [
      'a.ch-main-anchor',
      '#chapterlist ul li[data-num]',
      '.eplister ul li[data-num]',
      'div.eplister ul li',
      '#chapterlist li'
    ];
    
    for (const selector of lavatoonsSelectors) {
      const chapterElements = doc.querySelectorAll(selector);
      if (chapterElements.length > 0) {
        console.log(`[Chapters] Found ${chapterElements.length} chapters with: ${selector}`);
        
        for (let i = 0; i < chapterElements.length; i++) {
          const chapterEl = chapterElements[i] as any;
          try {
            let chapterUrl = '';
            let chapterNumber = 0;
            let title = '';
            let dateText = '';
            
            // Handle a.ch-main-anchor directly
            if (chapterEl.tagName === 'A' && chapterEl.classList?.contains('ch-main-anchor')) {
              chapterUrl = chapterEl.getAttribute('href') || '';
              
              // Get title from .ch-num
              const chNumEl = chapterEl.querySelector('.ch-num');
              if (chNumEl) {
                title = chNumEl.textContent?.trim() || '';
              }
              
              // Get date from .ch-date
              const chDateEl = chapterEl.querySelector('.ch-date');
              if (chDateEl) {
                dateText = chDateEl.textContent?.trim() || '';
              }
            } else {
              // Handle li[data-num] structure
              const dataNum = chapterEl.getAttribute('data-num');
              chapterNumber = dataNum ? parseFloat(dataNum) : 0;
              
              const linkEl = chapterEl.querySelector('a');
              chapterUrl = linkEl?.getAttribute('href') || '';
              
              const chapterNumEl = chapterEl.querySelector('span.chapternum, .chapternum, .ch-num');
              if (chapterNumEl) {
                title = chapterNumEl.textContent?.trim().replace(/\s+/g, ' ') || '';
              }
              
              const dateEl = chapterEl.querySelector('span.chapterdate, .chapterdate, .ch-date');
              if (dateEl) {
                dateText = dateEl.textContent?.trim() || '';
              }
            }
            
            if (!chapterUrl) {
              continue;
            }
            
            // Extract chapter number from title or URL
            if (chapterNumber === 0 && title) {
              const numMatch = title.match(/(?:فصل|chapter)[^\d]*(\d+\.?\d*)/i);
              if (numMatch) {
                chapterNumber = parseFloat(numMatch[1]);
              } else {
                const simpleNumMatch = title.match(/(\d+\.?\d*)/);
                if (simpleNumMatch) {
                  chapterNumber = parseFloat(simpleNumMatch[1]);
                }
              }
            }
            
            if (chapterNumber === 0) {
              const urlMatch = chapterUrl.match(/chapter[_-]?(\d+\.?\d*)/i);
              if (urlMatch) {
                chapterNumber = parseFloat(urlMatch[1]);
              }
            }
            
            // Parse date (format: 2025/12/22)
            let releaseDate = null;
            if (dateText) {
              const dateMatch = dateText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
              if (dateMatch) {
                releaseDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
              } else {
                releaseDate = parseArabicDate(dateText);
              }
            }
            
            // Normalize URL
            if (!chapterUrl.startsWith('http')) {
              if (chapterUrl.startsWith('//')) {
                chapterUrl = 'https:' + chapterUrl;
              } else if (chapterUrl.startsWith('/')) {
                chapterUrl = config.baseUrl + chapterUrl;
              } else {
                chapterUrl = config.baseUrl + '/' + chapterUrl;
              }
            }
            
            // Avoid duplicates
            const exists = chapters.some(c => c.chapter_number === chapterNumber);
            if (!exists && chapterNumber > 0) {
              chapters.push({
                chapter_number: chapterNumber,
                title: title || `الفصل ${chapterNumber}`,
                source_url: chapterUrl,
                release_date: releaseDate,
              });
              
              console.log(`[Chapters] ✓ Chapter ${chapterNumber}: ${title?.substring(0, 30) || 'N/A'}`);
            }
          } catch (e: any) {
            console.error(`[Chapters] Error processing lavatoons chapter ${i + 1}:`, e?.message || e);
          }
        }
        
        if (chapters.length > 0) break;
      }
    }
    
    if (chapters.length > 0) {
      chapters.sort((a, b) => a.chapter_number - b.chapter_number);
      console.log(`[Chapters] Success: ${chapters.length} chapters for lavatoons`);
      return chapters;
    }
    
    console.log(`[Chapters] ⚠️ No lavatoons chapters found, trying standard selectors...`);
  }
  
  // Special handling for meshmanga.com - uses "الفصل: XX" format
  const isMeshmanga = sourceLower.includes('meshmanga') || mangaUrl.includes('meshmanga.com');
  if (isMeshmanga) {
    console.log(`[Chapters] Using meshmanga chapter extraction method`);
    
    // meshmanga format: الفصل: XX with links to /chapter/XXXXX
    // Try to extract chapter links from HTML
    const chapterLinkPattern = /<a[^>]+href=["'](https?:\/\/[^"']*meshmanga\.com\/chapter\/(\d+)[^"']*)["'][^>]*>/gi;
    const chapterTextPattern = /الفصل:\s*(\d+(?:\.\d+)?(?:\s+[^\n<]*)?)/gi;
    
    // First pass: get all chapter URLs
    const chapterUrls = new Map<number, string>();
    let linkMatch;
    while ((linkMatch = chapterLinkPattern.exec(html)) !== null) {
      const url = linkMatch[1];
      const chapterId = linkMatch[2];
      
      // Try to find chapter number from surrounding text or URL
      // The chapter ID in URL is not the chapter number, we need to find the actual number
      if (url && chapterId) {
        // Store with chapter ID for now, we'll match with actual numbers later
        chapterUrls.set(parseInt(chapterId), url);
      }
    }
    
    console.log(`[Chapters] Found ${chapterUrls.size} chapter URLs from meshmanga`);
    
    // Second pass: try to match chapter numbers with their URLs
    // Look for patterns like: href="...chapter/1720472"...الفصل: 114
    const fullPattern = /<a[^>]+href=["'](https?:\/\/[^"']*meshmanga\.com\/chapter\/\d+[^"']*)["'][^>]*>[\s\S]*?الفصل:\s*(\d+(?:\.\d+)?)/gi;
    let fullMatch;
    while ((fullMatch = fullPattern.exec(html)) !== null) {
      const url = fullMatch[1];
      const chapterNum = parseFloat(fullMatch[2]);
      
      if (url && chapterNum) {
        const existingChapter = chapters.find(c => c.chapter_number === chapterNum);
        if (!existingChapter) {
          chapters.push({
            chapter_number: chapterNum,
            title: `الفصل ${chapterNum}`,
            source_url: url,
            release_date: null,
          });
        }
      }
    }
    
    // Also try alternate pattern where chapter info is in separate elements
    const altPattern = /href=["'](https?:\/\/[^"']*meshmanga\.com\/chapter\/\d+[^"']*)["'][\s\S]{0,500}?الفصل:\s*(\d+(?:\.\d+)?)/gi;
    let altMatch;
    while ((altMatch = altPattern.exec(html)) !== null) {
      const url = altMatch[1];
      const chapterNum = parseFloat(altMatch[2]);
      
      if (url && chapterNum) {
        const existingChapter = chapters.find(c => c.chapter_number === chapterNum);
        if (!existingChapter) {
          chapters.push({
            chapter_number: chapterNum,
            title: `الفصل ${chapterNum}`,
            source_url: url,
            release_date: null,
          });
        }
      }
    }
    
    if (chapters.length > 0) {
      chapters.sort((a, b) => a.chapter_number - b.chapter_number);
      console.log(`[Chapters] ✅ Success: ${chapters.length} chapters for meshmanga`);
      return chapters;
    }
    
    console.log(`[Chapters] ⚠️ No meshmanga chapters found with regex, trying DOM...`);
  }
  
  // Try each chapter selector for other sources
  for (const chapterSelector of config.selectors.chapters) {
    const chapterElements = doc.querySelectorAll(chapterSelector);
    if (chapterElements.length > 0) {
      console.log(`[Chapters] Found ${chapterElements.length} chapters with: ${chapterSelector}`);
      
      // Process ALL chapters without any limits
      for (let i = 0; i < chapterElements.length; i++) {
        const chapterEl = chapterElements[i] as any;
        try {
          let chapterUrl = '';
          let title = '';
          
          // Try to find link - support multiple patterns
          for (const urlSelector of config.selectors.chapterUrl) {
            const linkEl = chapterEl.querySelector(urlSelector);
            if (linkEl) {
              chapterUrl = linkEl.getAttribute('href') || '';
              title = linkEl.textContent?.trim() || '';
              if (chapterUrl) break;
            }
          }
          
          // If no link found with selector, try the element itself if it's a link
          if (!chapterUrl && chapterEl.tagName === 'A') {
            chapterUrl = chapterEl.getAttribute('href') || '';
            title = chapterEl.textContent?.trim() || '';
          }
          
          // For olympustaff: check if element has a direct link child
          if (!chapterUrl) {
            const directLink = chapterEl.querySelector('a');
            if (directLink) {
              chapterUrl = directLink.getAttribute('href') || '';
            }
          }
          
          if (!chapterUrl) {
            console.log(`[Chapters] ⚠️ No URL found for chapter ${i + 1}`);
            continue;
          }
          
          // Extract chapter number - multiple methods
          let chapterNumber = 0;
          
          // Method 1: data-number attribute (olympustaff uses this)
          const dataNumber = chapterEl.getAttribute('data-number');
          if (dataNumber) {
            chapterNumber = parseFloat(dataNumber);
            console.log(`[Chapters] Got chapter number from data-number: ${chapterNumber}`);
          }
          
          // Method 2: Try title selectors
          if (chapterNumber === 0) {
            for (const titleSelector of config.selectors.chapterTitle) {
              const titleEl = chapterEl.querySelector(titleSelector);
              if (titleEl) {
                const titleText = titleEl.textContent?.trim() || '';
                // Extract number from Arabic text like "الفصل 22"
                const numMatch = titleText.match(/(\d+\.?\d*)/);
                if (numMatch) {
                  chapterNumber = parseFloat(numMatch[1]);
                  if (!title) title = titleText;
                  break;
                }
              }
            }
          }
          
          // Method 3: Extract from URL
          if (chapterNumber === 0) {
            // Match patterns like /series/manga-name/22 or /chapter/22 or chapter-22
            const urlPatterns = [
              /\/(\d+\.?\d*)\/?$/,
              /chapter[_-]?(\d+\.?\d*)/i,
              /ch[_-]?(\d+\.?\d*)/i,
              /(\d+\.?\d*)$/
            ];
            for (const pattern of urlPatterns) {
              const urlMatch = chapterUrl.match(pattern);
              if (urlMatch) {
                chapterNumber = parseFloat(urlMatch[1]);
                break;
              }
            }
          }
          
          // Method 4: Fallback to position
          if (chapterNumber === 0) {
            chapterNumber = chapterElements.length - i;
          }

          // Find date - try multiple selectors
          let dateText = '';
          for (const dateSelector of config.selectors.chapterDate) {
            const dateEl = chapterEl.querySelector(dateSelector);
            if (dateEl) {
              dateText = dateEl.textContent?.trim() || '';
              if (dateText) break;
            }
          }
          
          // Try data-date attribute (olympustaff uses timestamp)
          if (!dateText) {
            const dataDate = chapterEl.getAttribute('data-date');
            if (dataDate) {
              // Convert timestamp to date
              const timestamp = parseInt(dataDate);
              if (timestamp > 0) {
                const date = new Date(timestamp * 1000);
                dateText = date.toISOString().split('T')[0];
              }
            }
          }

          // Convert date to ISO format
          const releaseDate = parseArabicDate(dateText);
          
          // Get title from .chapter-title or .chapter-number
          if (!title || title.length < 3) {
            const chapterTitleEl = chapterEl.querySelector('.chapter-title, .chapter-number');
            if (chapterTitleEl) {
              title = chapterTitleEl.textContent?.trim() || '';
            }
          }
          
          // Normalize URL
          let fullUrl = chapterUrl;
          if (!fullUrl.startsWith('http')) {
            if (fullUrl.startsWith('//')) {
              fullUrl = 'https:' + fullUrl;
            } else if (fullUrl.startsWith('/')) {
              fullUrl = config.baseUrl + fullUrl;
            } else {
              fullUrl = config.baseUrl + '/' + fullUrl;
            }
          }
          
          chapters.push({
            chapter_number: chapterNumber,
            title: title || `الفصل ${chapterNumber}`,
            source_url: fullUrl,
            release_date: releaseDate,
          });
          
          console.log(`[Chapters] ✓ Chapter ${chapterNumber}: ${title?.substring(0, 30) || 'N/A'}`);
        } catch (e: any) {
          console.error(`[Chapters] Error processing chapter ${i + 1}:`, e?.message || e);
        }
      }
      
      break; // Found chapters, stop trying other selectors
    }
  }

  console.log(`[Chapters] Success: ${chapters.length} chapters scraped`);
  return chapters;
}

// Helper function to download and upload image to Supabase Storage - MEMORY OPTIMIZED
async function downloadAndUploadImage(
  imageUrl: string,
  supabase: any,
  bucket: string,
  path: string,
  referer?: string,
): Promise<string | null> {
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per image
    
    const response = await fetch(imageUrl, {
      headers: getBrowserHeaders(referer),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[Storage] Failed: ${response.status}`);
      return null;
    }
    
    // Stream directly to avoid memory bloat - use arrayBuffer directly
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check size - skip very large images to prevent memory issues
    if (uint8Array.length > 5 * 1024 * 1024) { // Skip images > 5MB
      console.warn(`[Storage] ⚠️ Image too large (${(uint8Array.length / 1024 / 1024).toFixed(1)}MB), skipping`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, uint8Array, {
        contentType,
        upsert: true
      });
    
    if (error) {
      console.error(`[Storage] Upload error:`, error.message);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    console.log(`[Storage] ✓ Uploaded`);
    return publicUrl;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[Storage] Timeout downloading image`);
    } else {
      console.error(`[Storage] Error:`, error?.message?.substring(0, 50));
    }
    return null;
  }
}

async function scrapeChapterPages(chapterUrl: string, source: string, supabase: any, chapterId: string) {
  console.log(`[Pages] Starting scrape: ${source} - ${chapterUrl}`);
  
  const config = await loadScraperConfig(supabase, source);
  if (!config) throw new Error(`Unknown source: ${source}. Please add it in Sources Manager first.`);

  const sourceLower = (source || '').toLowerCase();
  const isLavatoons = sourceLower.includes('lavatoons') || sourceLower.includes('lavascans') || chapterUrl.includes('lavatoons.com') || chapterUrl.includes('lavascans.com');
  const isMeshmanga = sourceLower.includes('meshmanga') || chapterUrl.includes('meshmanga.com');
  const isAzoramoon = sourceLower.includes('azoramoon') || chapterUrl.includes('azoramoon.com');
  const isLekmanga = sourceLower.includes('lekmanga') || chapterUrl.includes('lekmanga');

  // Ensure selectors shape
  config.selectors = config.selectors || {};
  config.selectors.pageImages = Array.isArray(config.selectors.pageImages) ? config.selectors.pageImages : [];

  // lekmanga: تحديث 2026 - دعم محسن للصور
  if (isLekmanga) {
    const forced = [
      '.reading-content img',
      '.page-break img',
      'img.wp-manga-chapter-img',
      '#image-container img',
      '#readerarea img',
      '.entry-content img[src*="wp-content/uploads"]',
      'img[data-src*="wp-content/uploads"]',
      'img[src*="/manga/"]',
      '.container img[src*="wp-content"]'
    ];
    config.selectors.pageImages = Array.from(new Set([...forced, ...config.selectors.pageImages]));
    console.log(`[Pages] Lekmanga mode enabled with ${forced.length} forced selectors`);
  }

  // lavatoons: تحديث 2026 - ts-main-image curdown with data-index
  if (isLavatoons) {
    const forced = [
      'img.ts-main-image.curdown',
      'img.ts-main-image[data-index]',
      'img[data-server]',
      '#readerarea img.ts-main-image', 
      '#readerarea img', 
      'img.ts-main-image'
    ];
    config.selectors.pageImages = Array.from(new Set([...forced, ...config.selectors.pageImages]));
  }
  
  // azoramoon: تحديث 2026 - data-image-index attribute and storage.azoramoon.com
  if (isAzoramoon) {
    const forced = [
      'img[data-image-index]',
      'img[src*="storage.azoramoon.com"]',
      '#readerarea img',
      '.rdminimal img',
      '.reading-content img'
    ];
    config.selectors.pageImages = Array.from(new Set([...forced, ...config.selectors.pageImages]));
  }
  
  // meshmanga: force selectors for appswat.com CDN images
  if (isMeshmanga) {
    const forced = ['.flex-col img.w-full', 'img.w-full.h-auto', 'img[src*="appswat.com"]', 'img[src*="/v2/media/series/"]'];
    config.selectors.pageImages = Array.from(new Set([...forced, ...config.selectors.pageImages]));
  }

  // Use Firecrawl for JS-rendered or protected sites (lavatoons, lekmanga, etc.)
  let html = '';
  let doc: any = null;

  const needsFirecrawl = isLavatoons || isLekmanga;

  if (needsFirecrawl) {
    const siteName = isLavatoons ? 'Lavatoons' : 'Lekmanga';
    console.log(`[Pages] ${siteName} detected - trying multiple methods to get HTML...`);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    
    // Method A: Try Firecrawl first (best for JS-rendered & protected content)
    if (firecrawlApiKey) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Pages] Firecrawl attempt ${attempt}/2 for: ${chapterUrl}`);
          
          const waitTime = attempt === 1 ? 5000 : 10000;
          
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: chapterUrl,
              formats: ['html', 'rawHtml'],
              onlyMainContent: false,
              waitFor: waitTime,
              skipTlsVerification: true,
              location: { country: 'SA', languages: ['ar', 'en'] },
            }),
          });

          const firecrawlData = await firecrawlResponse.json();
          
          if (firecrawlResponse.ok && firecrawlData.success) {
            const firecrawlHtml = firecrawlData.data?.rawHtml || firecrawlData.data?.html || '';
            console.log(`[Pages] Firecrawl returned ${firecrawlHtml.length} bytes`);
            
            if (firecrawlHtml.length > 1000 && !isCloudflareChallengePage(firecrawlHtml)) {
              html = firecrawlHtml;
              doc = new DOMParser().parseFromString(html, 'text/html');
              
              // Check for reader images
              const readerSelectors = isLavatoons 
                ? '#readerarea img, img.ts-main-image, img[data-index]'
                : '.reading-content img, .page-break img, img.wp-manga-chapter-img, img[src*="wp-content/uploads"]';
              const readerImgs = doc?.querySelectorAll(readerSelectors).length || 0;
              console.log(`[Pages] Firecrawl HTML has ${readerImgs} reader images`);
              
              if (readerImgs > 0) {
                console.log(`[Pages] ✓ Firecrawl success with ${readerImgs} images`);
                break;
              }
              
              // Even without DOM images, check regex for image URLs
              const hasWpContentImages = (firecrawlHtml.match(/wp-content\/uploads\/[^"'\s<>]+\.\w{3,4}/g) || []).length;
              if (hasWpContentImages > 3) {
                console.log(`[Pages] ✓ Firecrawl has ${hasWpContentImages} wp-content image URLs in HTML`);
                break;
              }
              
              console.log(`[Pages] Firecrawl HTML has no reader images, trying again...`);
              html = '';
              doc = null;
            }
          } else {
            const errMsg = firecrawlData.error || firecrawlData.message || 'Unknown error';
            console.log(`[Pages] Firecrawl error (attempt ${attempt}):`, errMsg);
            
            if (errMsg.includes('402') || errMsg.includes('credits') || errMsg.includes('Payment')) {
              console.log(`[Pages] Firecrawl credits exhausted, skipping...`);
              break;
            }
          }
          
          if (attempt < 2 && !html) {
            await new Promise(r => setTimeout(r, 2000));
          }
        } catch (e: any) {
          console.log(`[Pages] Firecrawl exception (attempt ${attempt}):`, e?.message);
        }
      }
    } else {
      console.log(`[Pages] Firecrawl API key not configured - will use direct fetch`);
    }
    
    // Method B: Direct fetch with enhanced headers
    if (!html || html.length < 1000) {
      console.log(`[Pages] Trying direct fetch with enhanced headers...`);
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await new Promise(r => setTimeout(r, getRandomDelay(1000, 3000)));
          
          const enhancedHeaders: HeadersInit = {
            ...getBrowserHeaders(chapterUrl),
            'Cookie': '_ga=GA1.1.123456789.1234567890; cf_clearance=bypass_token_' + Date.now(),
          };
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const response = await fetch(chapterUrl, {
            headers: enhancedHeaders,
            redirect: 'follow',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const fetchedHtml = await response.text();
            console.log(`[Pages] Direct fetch returned ${fetchedHtml.length} bytes (attempt ${attempt})`);
            
            if (fetchedHtml.length > 5000 && !isCloudflareChallengePage(fetchedHtml)) {
              html = fetchedHtml;
              doc = new DOMParser().parseFromString(html, 'text/html');
              
              // Check for images (DOM or regex)
              const hasImages = isLavatoons
                ? (doc?.querySelectorAll('#readerarea img, img.ts-main-image').length || 0) > 0
                : (doc?.querySelectorAll('.reading-content img, .page-break img, img[src*="wp-content/uploads"]').length || 0) > 0 ||
                  (fetchedHtml.match(/wp-content\/uploads\/[^"'\s<>]+\.\w{3,4}/g) || []).length > 3;
              
              if (hasImages || fetchedHtml.includes('wp-content/uploads/manga')) {
                console.log(`[Pages] ✓ Direct fetch success`);
                break;
              }
            } else if (fetchedHtml.length <= 5000) {
              console.log(`[Pages] Response too short (attempt ${attempt})`);
            } else {
              console.log(`[Pages] Cloudflare challenge detected (attempt ${attempt})`);
            }
          } else {
            console.log(`[Pages] Direct fetch failed: ${response.status} (attempt ${attempt})`);
          }
        } catch (e: any) {
          console.log(`[Pages] Direct fetch exception (attempt ${attempt}):`, e?.message);
        }
      }
    }
  }
  
  // Fallback to regular fetch for other sources or if above methods failed
  if (!html || html.length < 1000) {
    console.log(`[Pages] Using regular fetchHTML...`);
    html = await fetchHTML(chapterUrl, config);
    doc = new DOMParser().parseFromString(html, 'text/html');
  }
  
  if (!doc) throw new Error('Failed to parse HTML');

  const pages: any[] = [];

  // Collect ALL images from the chapter
  const urlSet = new Set<string>();

  const isLavatoonsChapterPageImage = (u: string) => {
    // تحديث 2026: دعم أوسع لصور lavatoons/lavascans
    // Example: /wp-content/uploads/manga/943a9860/001.jpg
    // Example: https://lavascans.com/wp-content/uploads/manga/3ebf2f1c/002.jpg
    // Example: /wp-content/uploads/WP-manga/data/manga_xxx/chapter-xx/01.jpg
    const patterns = [
      /\/wp-content\/uploads\/manga\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
      /\/wp-content\/uploads\/WP-manga\/data\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
      /(?:lavatoons|lavascans)\.com\/wp-content\/uploads\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
      /\/wp-content\/uploads\/[^"'\s<>]+chapter[^"'\s<>]*\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
      // صور برقم فقط (001.jpg, 02.webp) من أي مسار uploads
      /\/wp-content\/uploads\/[^"'\s<>]+\/\d{1,3}\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i,
    ];
    return patterns.some(p => p.test(u));
  };

  const isMeshmangaChapterPageImage = (u: string) => {
    // Example: https://appswat.com/v2/media/series/the_indomitable_martial_king/chapters/7600/0001.webp
    // Accept images from appswat.com or meshmanga CDN with numeric filenames
    return /appswat\.com\/v2\/media\/series\/[^"'\s<>]+\/chapters\/[^"'\s<>]+\/\d{4}\.(?:jpg|jpeg|png|webp|gif)/i.test(u) ||
           /\/v2\/media\/series\/[^"'\s<>]+\/chapters\/[^"'\s<>]+\/\d{4}\.(?:jpg|jpeg|png|webp|gif)/i.test(u);
  };
  
  const isAzoramoonChapterPageImage = (u: string) => {
    // تحديث 2026: صور من storage.azoramoon.com
    // Example: https://storage.azoramoon.com/public//upload/series/a-bad-example-of-a-perfect-curse/kGP8JsrsZz/02.webp
    return /storage\.azoramoon\.com\/public\/+upload\/series\/[^"'\s<>]+\/\d{2,4}\.(?:jpg|jpeg|png|webp|gif)/i.test(u) ||
           /storage\.azoramoon\.com\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif)/i.test(u);
  };
  
  // lekmanga: دعم محسن للصور - تحديث 2026
  const isLekmangaChapterPageImage = (u: string) => {
    // Accept images from wp-content/uploads with manga/chapter patterns
    const patterns = [
      /\/wp-content\/uploads\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
      /lekmanga[^"'\s<>]*\/wp-content\/uploads\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif)/i,
      /\/manga\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
      /\/chapters?\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/i,
    ];
    return patterns.some(p => p.test(u));
  };

  const addUrl = (rawUrl?: string | null) => {
    if (!rawUrl) return;
    const cleanedUrl = cleanUrl(rawUrl);
    if (!cleanedUrl) return;

    if (cleanedUrl.startsWith('data:image')) return;
    // تخفيف الفلتر - فقط استبعاد الملفات الواضحة
    if (/(?:placeholder|logo|icon|avatar|banner|site-logo|favicon)/i.test(cleanedUrl)) return;
    // استبعاد ثمبنيلز الصغيرة
    if (/[_-](?:thumb|small|tiny|mini|150x|100x)\./i.test(cleanedUrl)) return;

    // lavatoons: الصفحة فيها صور كثيرة. نسمح فقط بصور الفصل الحقيقية
    if (isLavatoons && !isLavatoonsChapterPageImage(cleanedUrl)) {
      console.log(`[Pages] Skipping non-chapter image: ${cleanedUrl.substring(0, 80)}`);
      return;
    }
    
    // meshmanga: نسمح فقط بصور الفصل من appswat.com CDN
    if (isMeshmanga && !isMeshmangaChapterPageImage(cleanedUrl)) {
      return;
    }
    
    // azoramoon: نسمح فقط بصور من storage.azoramoon.com
    if (isAzoramoon && !isAzoramoonChapterPageImage(cleanedUrl)) {
      return;
    }
    
    // lekmanga: فلتر خاص لتجنب سحب الصور غير المتعلقة بالفصل
    if (isLekmanga) {
      // نقبل جميع صور wp-content/uploads
      const isValidLekmangaImage = isLekmangaChapterPageImage(cleanedUrl) || 
                                    cleanedUrl.includes('wp-content/uploads');
      if (!isValidLekmangaImage) {
        return;
      }
    }

    urlSet.add(cleanedUrl);
  };

  // Method 1: Try DOM selectors
  for (const imageSelector of config.selectors.pageImages) {
    try {
      const imageElements = doc.querySelectorAll(imageSelector);
      if (imageElements.length > 0) {
        console.log(`[Pages] Found ${imageElements.length} images with selector: ${imageSelector}`);

        for (let i = 0; i < imageElements.length; i++) {
          const img = imageElements[i] as any;
          const imgUrl =
            img.getAttribute('src') ||
            img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src') ||
            img.getAttribute('data-original') ||
            '';

          if (imgUrl) addUrl(imgUrl);
        }

        if (urlSet.size > 0 && !isLavatoons) {
          console.log(`[Pages] Extracted ${urlSet.size} unique image URLs from DOM`);
          break; // Use first successful selector for non-lavatoons
        }
      }
    } catch (err: any) {
      console.log(`[Pages] Error with selector ${imageSelector}:`, err?.message);
    }
  }

  // Method 2: Regex extraction
  // For lavatoons/azoramoon we scope regex to #readerarea only to avoid picking theme images/covers.
  if (urlSet.size === 0 || isLavatoons || isAzoramoon) {
    console.log(`[Pages] Trying regex extraction...`);

    const readerAreaMatch = (isLavatoons || isAzoramoon)
      ? html.match(/<div[^>]+id=["']readerarea["'][^>]*>[\s\S]*?<\/div>/i)
      : null;
    const regexScopeHtml = readerAreaMatch?.[0] || html;

    const regexPatterns = isLavatoons
      ? [
          // تحديث 2026: ts-main-image curdown with data-index أولاً
          /<img[^>]+class="[^"]*ts-main-image[^"]*curdown[^"]*"[^>]+src="([^"]+)"/gi,
          /<img[^>]+src="([^"]+)"[^>]+class="[^"]*ts-main-image[^"]*curdown[^"]*"/gi,
          /<img[^>]+class="[^"]*ts-main-image[^"]*"[^>]+src="([^"]+)"/gi,
          // Absolute URLs (normal) - lavatoons and lavascans من أي مسار uploads
          /https?:\/\/(?:www\.)?(?:lavatoons|lavascans)\.com\/wp-content\/uploads\/[^"'\s<>]+?\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
          // WP-manga data path
          /https?:\/\/(?:www\.)?(?:lavatoons|lavascans)\.com\/wp-content\/uploads\/WP-manga\/data\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif)/gi,
          // Absolute URLs (JSON-escaped: https:\/\/lavatoons.com\/...)
          /https?:\\\/\\\/(?:www\\\.)?(?:lavatoons|lavascans)\.com\\\/wp-content\\\/uploads\\\/[^"'\s<>]+?\\\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
          // Relative URLs - أي مسار uploads مع ملف رقمي
          /\/wp-content\/uploads\/manga\/[^"'\s<>]+?\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
          /\/wp-content\/uploads\/[^"'\s<>]+?\/\d{1,3}\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
          // img tags with data-index attribute (2026 structure)
          /<img[^>]+data-index=["']\d+["'][^>]+src="([^"]+)"/gi,
          /<img[^>]+src="([^"]+)"[^>]+data-index=["']\d+["']/gi,
        ]
      : isAzoramoon
        ? [
            // azoramoon تحديث 2026: صور من storage.azoramoon.com
            /https?:\/\/storage\.azoramoon\.com\/public\/+upload\/series\/[^"'\s<>]+\/\d{2,4}\.(?:jpg|jpeg|png|webp|gif)/gi,
            /https?:\/\/storage\.azoramoon\.com\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif)/gi,
            // صور مع data-image-index
            /<img[^>]+data-image-index=["']\d+["'][^>]+src="([^"]+)"/gi,
            /<img[^>]+src="([^"]+)"[^>]+data-image-index=["']\d+["']/gi,
          ]
        : isMeshmanga
          ? [
              // meshmanga: صور من appswat.com CDN
              /https?:\/\/appswat\.com\/v2\/media\/series\/[^"'\s<>]+\/chapters\/[^"'\s<>]+\/\d{4}\.(?:jpg|jpeg|png|webp|gif)/gi,
              // أي صورة من meshmanga بنمط chapters/XXXX/YYYY.webp
              /https?:\/\/[^"'\s<>]+\/v2\/media\/series\/[^"'\s<>]+\/chapters\/[^"'\s<>]+\/\d{4}\.(?:jpg|jpeg|png|webp|gif)/gi,
              // صور w-full h-auto
              /<img[^>]+class="[^"]*w-full[^"]*h-auto[^"]*"[^>]+src="([^"]+)"/gi,
            ]
          : isLekmanga
            ? [
                // lekmanga تحديث 2026: دعم محسن للصور
                // صور من .reading-content أو .page-break
                /<div[^>]+class="[^"]*(?:reading-content|page-break)[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"/gi,
                // صور wp-manga-chapter-img
                /<img[^>]+class="[^"]*wp-manga-chapter-img[^"]*"[^>]+src="([^"]+)"/gi,
                /<img[^>]+src="([^"]+)"[^>]+class="[^"]*wp-manga-chapter-img[^"]*"/gi,
                // صور من wp-content/uploads مع أرقام
                /https?:\/\/[^"'\s<>]+lekmanga[^"'\s<>]*\/wp-content\/uploads\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif)/gi,
                /https?:\/\/[^"'\s<>]+\/wp-content\/uploads\/[^"'\s<>]+\/\d{1,4}\.(?:jpg|jpeg|png|webp|gif)/gi,
                // أي صورة من wp-content/uploads
                /https?:\/\/[^"'\s<>]+\/wp-content\/uploads\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
                // data-src attributes
                /data-src="([^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi,
                /data-lazy-src="([^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi,
              ]
            : [
                /https?:\/\/[^"'\s<>]+\/wp-content\/uploads\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
                /https?:\/\/[^"'\s<>]+\/manga\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi,
                /<img[^>]+class="[^"]*ts-main-image[^"]*"[^>]+src="([^"]+)"/gi,
              ];

    for (const pattern of regexPatterns) {
      const matches = regexScopeHtml.matchAll(pattern);
      for (const match of matches) {
        addUrl(match[1] || match[0]);
      }

      if (urlSet.size > 0 && !isLavatoons && !isMeshmanga && !isAzoramoon) {
        console.log(`[Pages] Regex extracted ${urlSet.size} image URLs`);
        break;
      }
    }

    if (urlSet.size > 0) {
      console.log(`[Pages] Regex total unique URLs so far: ${urlSet.size}`);
    }
  }
  
  // Method 3: Specific azoramoon extraction (storage.azoramoon.com images)
  if (isAzoramoon && urlSet.size === 0) {
    console.log(`[Pages] Trying azoramoon specific extraction...`);
    
    // البحث عن صور مع data-image-index attribute
    const imgPattern = /src=["'](https?:\/\/storage\.azoramoon\.com\/[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/gi;
    let imgMatch;
    while ((imgMatch = imgPattern.exec(html)) !== null) {
      const imgUrl = imgMatch[1];
      if (imgUrl) {
        urlSet.add(imgUrl);
      }
    }
    
    // أيضاً البحث عن الصور في wsrv.nl proxy
    const wsrvPattern = /src=["']https?:\/\/wsrv\.nl\/\?url=(https?[^&"']+)/gi;
    while ((imgMatch = wsrvPattern.exec(html)) !== null) {
      let imgUrl = decodeURIComponent(imgMatch[1]);
      if (imgUrl.includes('storage.azoramoon.com')) {
        urlSet.add(imgUrl);
      }
    }
    
    console.log(`[Pages] Azoramoon specific extraction found ${urlSet.size} images`);
  }
  
  // Method: Specific lekmanga extraction
  if (isLekmanga && urlSet.size === 0) {
    console.log(`[Pages] Trying lekmanga specific extraction...`);
    
    // Look for all img tags in reading-content or page-break divs
    const imgPatterns = [
      /src=["'](https?:\/\/[^"']+\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi,
      /data-src=["'](https?:\/\/[^"']+\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi,
      /data-lazy-src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi,
    ];
    
    for (const pattern of imgPatterns) {
      let imgMatch;
      while ((imgMatch = pattern.exec(html)) !== null) {
        const imgUrl = imgMatch[1];
        if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('thumb')) {
          urlSet.add(imgUrl);
        }
      }
    }
    
    console.log(`[Pages] Lekmanga specific extraction found ${urlSet.size} images`);
  }
  
  // Method 3: Specific meshmanga extraction (appswat.com images)
  if (isMeshmanga && urlSet.size === 0) {
    console.log(`[Pages] Trying meshmanga specific extraction...`);
    
    // Look for all img tags with appswat.com sources
    const imgPattern = /src=["'](https?:\/\/appswat\.com\/v2\/media\/series\/[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/gi;
    let imgMatch;
    while ((imgMatch = imgPattern.exec(html)) !== null) {
      const imgUrl = imgMatch[1];
      if (imgUrl && /\/chapters\/[^\/]+\/\d{4}\./.test(imgUrl)) {
        urlSet.add(imgUrl);
      }
    }
    
    console.log(`[Pages] Meshmanga specific extraction found ${urlSet.size} images`);
  }

  // Method 3: Robust ts_reader_control.pages extraction (lavatoons)
  if (urlSet.size === 0 || isLavatoons) {
    const keyMatch = /ts_reader_control\s*\.\s*pages\s*=\s*\[/i.exec(html);
    if (keyMatch) {
      const startIdx = html.indexOf('[', keyMatch.index);
      if (startIdx >= 0) {
        // Extract the full array literal by walking brackets (handles newlines safely)
        let depth = 0;
        let inString: '"' | "'" | null = null;
        let escaped = false;
        let endIdx = -1;

        for (let i = startIdx; i < html.length; i++) {
          const ch = html[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (inString) {
            if (ch === '\\') {
              escaped = true;
              continue;
            }
            if (ch === inString) {
              inString = null;
            }
            continue;
          }

          if (ch === '"' || ch === "'") {
            inString = ch as any;
            continue;
          }

          if (ch === '[') depth++;
          if (ch === ']') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }

        if (endIdx > startIdx) {
          const arrayLiteral = html.slice(startIdx, endIdx + 1);

// Extract any image URLs inside the array (even if structure changes)
// - normal: https://...
// - escaped: https:\/\/...
for (const m of arrayLiteral.matchAll(
  /https?:\/\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi
)) {
  addUrl(m[0]);
}
for (const m of arrayLiteral.matchAll(
  /https?:\\\/\\\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi
)) {
  addUrl(m[0]);
}
for (const m of arrayLiteral.matchAll(
  /\/wp-content\/uploads\/manga\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi
)) {
  addUrl(m[0]);
}

          console.log(`[Pages] ts_reader_control.pages total unique URLs so far: ${urlSet.size}`);
        }
      }
    }

    if (isLavatoons && urlSet.size <= 1) {
      const idx = html.toLowerCase().indexOf('ts_reader_control');
      if (idx >= 0) {
        console.log(`[Pages] Debug ts_reader_control snippet: ${html.substring(idx, idx + 400)}`);
      }
    }
  }

  // Method 4: Lavatoons specific - extract all images directly from img tags with class ts-main-image
  if (isLavatoons && urlSet.size === 0) {
    console.log(`[Pages] Trying lavatoons direct img extraction...`);
    
    // استخراج جميع img tags مع class ts-main-image
    const tsMainImagePattern = /<img[^>]+class="[^"]*ts-main-image[^"]*"[^>]*>/gi;
    let imgTagMatch;
    while ((imgTagMatch = tsMainImagePattern.exec(html)) !== null) {
      const imgTag = imgTagMatch[0];
      // استخراج src من الـ tag
      const srcMatch = imgTag.match(/src="([^"]+)"/i);
      if (srcMatch && srcMatch[1]) {
        let imgUrl = srcMatch[1];
        // تحقق من أن الصورة من مسار manga
        if (imgUrl.includes('/wp-content/uploads/') && /\/\d{1,3}\.(?:jpg|jpeg|png|webp|gif)/i.test(imgUrl)) {
          // إذا كان مسار نسبي، أضف الدومين
          if (!imgUrl.startsWith('http')) {
            imgUrl = 'https://lavascans.com' + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
          }
          urlSet.add(imgUrl);
          console.log(`[Pages] ts-main-image found: ${imgUrl.substring(0, 80)}`);
        }
      }
    }
    
    // أيضاً استخراج img tags مع data-index attribute
    const dataIndexPattern = /<img[^>]+data-index=["']\d+["'][^>]*src="([^"]+)"/gi;
    let dataIdxMatch;
    while ((dataIdxMatch = dataIndexPattern.exec(html)) !== null) {
      let imgUrl = dataIdxMatch[1];
      if (imgUrl && /\/\d{1,3}\.(?:jpg|jpeg|png|webp|gif)/i.test(imgUrl)) {
        if (!imgUrl.startsWith('http')) {
          imgUrl = 'https://lavascans.com' + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
        }
        urlSet.add(imgUrl);
      }
    }
    
    console.log(`[Pages] Lavatoons direct extraction found ${urlSet.size} images`);
  }

  // Method 5: Final fallback for lavatoons - extract any wp-content image with numeric filename
  if (isLavatoons && urlSet.size === 0) {
    console.log(`[Pages] Trying lavatoons final fallback...`);
    
    // البحث عن أي صورة من wp-content/uploads مع اسم رقمي
    const wpContentPattern = /(?:https?:\/\/[^"'\s<>]+)?\/wp-content\/uploads\/[^"'\s<>]+\/(\d{1,3})\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?/gi;
    let wpMatch;
    const foundUrls: {url: string, num: number}[] = [];
    
    while ((wpMatch = wpContentPattern.exec(html)) !== null) {
      let imgUrl = wpMatch[0];
      const pageNum = parseInt(wpMatch[1]);
      
      // تجاهل الصور الصغيرة (thumbnails) والأغلفة
      if (imgUrl.includes('cover') || imgUrl.includes('thumb') || imgUrl.includes('banner')) continue;
      
      if (!imgUrl.startsWith('http')) {
        imgUrl = 'https://lavascans.com' + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
      }
      
      foundUrls.push({url: imgUrl, num: pageNum});
    }
    
    // رتب حسب رقم الصفحة وأضف فقط الصور المتسلسلة
    foundUrls.sort((a, b) => a.num - b.num);
    for (const item of foundUrls) {
      urlSet.add(item.url);
    }
    
    console.log(`[Pages] Lavatoons fallback found ${urlSet.size} images`);
  }

  const extractedUrls = Array.from(urlSet);

  // Sort images by page number if possible
  extractedUrls.sort((a, b) => {
    const numA = parseInt(a.match(/\/(\d+)\.(?:jpg|jpeg|png|webp|gif)/i)?.[1] || '0');
    const numB = parseInt(b.match(/\/(\d+)\.(?:jpg|jpeg|png|webp|gif)/i)?.[1] || '0');
    return numA - numB;
  });

  console.log(`[Pages] Total unique images to process: ${extractedUrls.length}`);

  if (extractedUrls.length === 0) {
    console.warn('[Pages] No images found with any method');
    // Log a sample of HTML for debugging
    console.log(`[Pages] HTML sample: ${html.substring(0, 500)}`);
    return pages;
  }
  
  // Process images sequentially to prevent memory issues
  const MAX_PAGES = 80; // Increased limit
  const imagesToProcess = Math.min(extractedUrls.length, MAX_PAGES);
  
  console.log(`[Pages] Processing ${imagesToProcess} images...`);
  
  for (let index = 0; index < imagesToProcess; index++) {
    let imageUrl = extractedUrls[index];
    
    if (!imageUrl) continue;
    
    // Normalize URL
    if (!imageUrl.startsWith('http')) {
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = config.baseUrl + imageUrl;
      } else {
        imageUrl = config.baseUrl + '/' + imageUrl;
      }
    }
    
    console.log(`[Pages] ${index + 1}/${imagesToProcess}: ${imageUrl.substring(0, 60)}...`);
    
    const fileName = `${chapterId}/page-${index + 1}.jpg`;
    const uploadedUrl = await downloadAndUploadImage(imageUrl, supabase, 'chapter-pages', fileName, chapterUrl);
    
    if (uploadedUrl) {
      pages.push({
        page_number: index + 1,
        image_url: uploadedUrl,
      });
    }
  }
  
  if (extractedUrls.length > MAX_PAGES) {
    console.log(`[Pages] ⚠️ Limited to ${MAX_PAGES}/${extractedUrls.length} pages`);
  }

  console.log(`[Pages] ✅ Success: ${pages.length} pages uploaded`);
  return pages;
}

async function scrapeCatalog(source: string, limit = 20, supabase: any) {
  console.log(`[Catalog] 📑 Starting full catalog scrape from ${source.toUpperCase()} - limit ${limit}`);
  
  const config = await loadScraperConfig(supabase, source);
  if (!config) throw new Error(`Unknown source: ${source}. Please add it in Sources Manager first.`);

  // Try different catalog URLs based on source
  const catalogUrls = [
    config.baseUrl,
    config.baseUrl + '/manga',
    config.baseUrl + '/series',
    config.baseUrl + '/mangalist',
    config.baseUrl + '/manga-list'
  ];

  const mangaList: any[] = [];
  
  // Try each catalog URL until we find manga
  for (const catalogUrl of catalogUrls) {
    console.log(`[Catalog] Trying URL: ${catalogUrl}`);
    
    try {
      const html = await fetchHTML(catalogUrl, config);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (!doc) continue;

      if (config.selectors.catalogMangaCard && Array.isArray(config.selectors.catalogMangaCard)) {
        for (const cardSelector of config.selectors.catalogMangaCard) {
          const cards = doc.querySelectorAll(cardSelector);
          if (cards.length > 0) {
            console.log(`[Catalog] ✓ Found ${cards.length} manga cards with: ${cardSelector}`);
            
            for (let i = 0; i < cards.length && mangaList.length < limit; i++) {
              const card = cards[i] as any;
              
              // Try to find link in card
              let mangaUrl = '';
              const linkSelectors = config.selectors.catalogMangaLink || ['a'];
              
              for (const linkSelector of linkSelectors) {
                const link = card.querySelector(linkSelector);
                if (link) {
                  let href = link.getAttribute('href') || '';
                  if (href && !href.includes('javascript:')) {
                    // Normalize URL
                    if (!href.startsWith('http')) {
                      href = href.startsWith('//') ? 'https:' + href : 
                             href.startsWith('/') ? config.baseUrl + href : 
                             config.baseUrl + '/' + href;
                    }
                    
                    // Check if it's a valid manga URL (more flexible patterns)
                    const validPatterns = ['/manga/', '/series/', '/comic/', '/webtoon/', '/title/', '/work/'];
                    const isValidUrl = validPatterns.some(pattern => href.includes(pattern));
                    
                    // If URL contains the base domain and doesn't look like homepage/category
                    const notExcluded = !href.match(/\/(page|category|genre|tag|author|artist)\//) && 
                                       href !== config.baseUrl && 
                                       href !== config.baseUrl + '/';
                    
                    if ((isValidUrl || notExcluded) && href.length > config.baseUrl.length + 5) {
                      mangaUrl = href;
                      break;
                    }
                  }
                }
              }
              
              if (!mangaUrl) {
                console.log(`[Catalog] ⚠️ No valid link found in card ${i + 1}`);
                continue;
              }
              
              // Check if already processed
              const alreadyExists = mangaList.some(m => m.url === mangaUrl);
              if (alreadyExists) {
                console.log(`[Catalog] ⚠️ Duplicate manga: ${mangaUrl}`);
                continue;
              }
              
              console.log(`[Catalog] Processing manga ${mangaList.length + 1}/${limit}: ${mangaUrl}`);
              
              // Scrape full manga info and chapters
              try {
                await humanDelay(); // Be respectful to the server
                
                const mangaInfo = await scrapeMangaInfo(mangaUrl, source, supabase);
                
                // Save manga to database
                const { data: manga, error: mangaError } = await supabase
                  .from('manga')
                  .upsert(mangaInfo, { onConflict: 'source_url' })
                  .select()
                  .single();

                if (mangaError) {
                  console.error(`[Catalog] Error saving manga:`, mangaError);
                  continue;
                }
                
                console.log(`[Catalog] ✓ Saved manga: ${manga.title}`);
                
                // Scrape chapter list only (not pages to avoid timeout)
                await humanDelay();
                const chaptersData = await scrapeChapters(mangaUrl, source, supabase);
                
                if (chaptersData.length > 0) {
                  console.log(`[Catalog] Found ${chaptersData.length} chapters, saving metadata only...`);
                  
                  // Save chapter metadata only (pages will be scraped on-demand)
                  for (const chapter of chaptersData) {
                    const { error: chapterError } = await supabase
                      .from('chapters')
                      .upsert({ ...chapter, manga_id: manga.id }, { onConflict: 'manga_id,chapter_number' });
                    
                    if (chapterError) {
                      console.error(`[Catalog] Error saving chapter ${chapter.chapter_number}:`, chapterError);
                    }
                  }
                  
                  // Update chapter count
                  await supabase
                    .from('manga')
                    .update({ chapter_count: chaptersData.length })
                    .eq('id', manga.id);
                  
                  console.log(`[Catalog] ✓ Saved ${chaptersData.length} chapters (metadata only)`);
                }
                
                mangaList.push({
                  url: mangaUrl,
                  title: manga.title,
                  chaptersCount: chaptersData.length
                });
                
              } catch (error: any) {
                console.error(`[Catalog] Error processing manga ${mangaUrl}:`, error.message);
                continue;
              }
            }
            
            // If we found manga, stop trying other selectors and URLs
            if (mangaList.length > 0) {
              break;
            }
          }
        }
      }
      
      // If we found manga, stop trying other URLs
      if (mangaList.length > 0) {
        break;
      }
    } catch (error: any) {
      console.log(`[Catalog] Failed to fetch ${catalogUrl}:`, error.message);
      continue;
    }
  }

  console.log(`[Catalog] Complete: ${mangaList.length} manga with full info and chapters`);
  
  if (mangaList.length === 0) {
    console.warn(`[Catalog] ⚠️ No manga found. Check selectors in database for source: ${source}`);
  }
  
  return mangaList;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const isNearTimeout = () => (Date.now() - startTime) > FUNCTION_TIMEOUT;

  try {
    const { url, jobType, chapterId, source = 'onma', limit = 20 }: ScrapeMangaRequest = await req.json();
    
    console.log(`\n========================================`);
    console.log(`🚀 NEW SCRAPE JOB`);
    console.log(`📍 Source: ${source.toUpperCase()}`);
    console.log(`🎯 Type: ${jobType}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`========================================\n`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        source,
        url,
        status: 'processing',
        job_type: jobType,
        retry_count: 0,
        max_retries: MAX_RETRIES,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[Job] Creation failed:', jobError);
      throw jobError;
    }

    console.log(`[Job] Created: ${job.id}`);

    try {
      if (jobType === 'catalog') {
        const mangaList = await scrapeCatalog(source, limit, supabase);
        
        await supabase
          .from('scrape_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ success: true, mangaList, count: mangaList.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (jobType === 'manga_info' || jobType === 'chapters') {
        const mangaInfo = await scrapeMangaInfo(url, source, supabase);
        
        const { data: manga, error: mangaError } = await supabase
          .from('manga')
          .upsert(mangaInfo, { onConflict: 'source_url' })
          .select()
          .single();

        if (mangaError) throw mangaError;

        let chaptersData = [];
        const savedChapters: any[] = [];
        
        if (jobType === 'chapters') {
          chaptersData = await scrapeChapters(url, source, supabase);
          
          let savedCount = 0;
          // Save chapter metadata
          for (const chapter of chaptersData) {
            if (isNearTimeout()) {
              console.log(`[Chapters] ⚠️ Timeout approaching, saved ${savedCount}/${chaptersData.length} chapters`);
              break;
            }
            
            const { data: savedChapter, error: chapterError } = await supabase
              .from('chapters')
              .upsert({ ...chapter, manga_id: manga.id }, { onConflict: 'manga_id,chapter_number' })
              .select()
              .single();
            
            if (!chapterError && savedChapter) {
              savedCount++;
              savedChapters.push(savedChapter);
            } else {
              console.error(`[Chapters] Error saving chapter ${chapter.chapter_number}:`, chapterError);
            }
          }
          
          // Update chapter count
          await supabase
            .from('manga')
            .update({ chapter_count: savedCount })
            .eq('id', manga.id);
          
          console.log(`[Chapters] ✓ Saved ${savedCount} chapters`);
          
          // تحميل صفحات الفصول تلقائياً - ONE AT A TIME to prevent memory issues
          console.log(`[AutoPages] 🚀 Starting sequential page download for first 5 chapters...`);
          
          // Only download first 5 chapters to avoid timeout/memory limits
          const MAX_CHAPTERS_AUTO = 5;
          let pagesDownloaded = 0;
          const chaptersToProcess = savedChapters.slice(0, MAX_CHAPTERS_AUTO);
          
          for (let i = 0; i < chaptersToProcess.length; i++) {
            if (isNearTimeout()) {
              console.log(`[AutoPages] ⚠️ Timeout approaching, stopping at chapter ${i}`);
              break;
            }
            
            const chapter = chaptersToProcess[i];
            try {
              // Check if chapter already has pages
              const { count } = await supabase
                .from('chapter_pages')
                .select('*', { count: 'exact', head: true })
                .eq('chapter_id', chapter.id);
              
              if (count && count > 0) {
                console.log(`[AutoPages] ⏭️ Ch ${chapter.chapter_number} has ${count} pages, skip`);
                continue;
              }
              
              console.log(`[AutoPages] 📥 Ch ${chapter.chapter_number} (${i+1}/${chaptersToProcess.length})...`);
              const pages = await scrapeChapterPages(chapter.source_url, source, supabase, chapter.id);
              
              // Save pages one by one
              for (const page of pages) {
                await supabase
                  .from('chapter_pages')
                  .upsert({ ...page, chapter_id: chapter.id }, { onConflict: 'chapter_id,page_number' });
              }
              
              pagesDownloaded += pages.length;
              console.log(`[AutoPages] ✓ Ch ${chapter.chapter_number}: ${pages.length} pages`);
              
              // Small delay between chapters
              await delay(500);
            } catch (err: any) {
              console.error(`[AutoPages] ✗ Ch ${chapter.chapter_number}:`, err?.message?.substring(0, 50));
            }
          }
          
          console.log(`[AutoPages] ✅ Done: ${pagesDownloaded} pages (${chaptersToProcess.length}/${savedChapters.length} chapters)`);
        }

        await supabase
          .from('scrape_jobs')
          .update({ 
            manga_id: manga.id, 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            manga, 
            chaptersCount: chaptersData.length,
            pagesDownloaded: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (jobType === 'pages' && chapterId) {
        const pages = await scrapeChapterPages(url, source, supabase, chapterId);
        
        for (const page of pages) {
          await supabase
            .from('chapter_pages')
            .upsert({ ...page, chapter_id: chapterId }, { onConflict: 'chapter_id,page_number' });
        }

        await supabase
          .from('scrape_jobs')
          .update({ 
            chapter_id: chapterId,
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ success: true, pagesCount: pages.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Invalid job type');

    } catch (scrapeError: any) {
      const errorMsg = scrapeError?.message || String(scrapeError);
      console.error(`[Scrape] ❌ Error from ${source.toUpperCase()}:`, errorMsg);
      
      // Provide user-friendly error messages in Arabic and English
      let userFriendlyError = errorMsg;
      let errorType = 'UNKNOWN';
      
      if (errorMsg.includes('CLOUDFLARE_PROTECTION') || errorMsg.includes('CLOUDFLARE') || errorMsg.includes('Cloudflare')) {
        errorType = 'CLOUDFLARE';
        userFriendlyError = `🛡️ الموقع ${source.toUpperCase()} محمي بـ Cloudflare ولا يمكن تجاوز الحماية من الخادم. جرب مصدر آخر.\n\n` +
          `🛡️ ${source.toUpperCase()} is protected by Cloudflare. Cannot bypass from server. Try a different source.`;
      } else if (errorMsg.includes('ORIGIN_SERVER_TIMEOUT') || errorMsg.includes('522')) {
        errorType = 'TIMEOUT_522';
        userFriendlyError = `⏱️ الموقع ${source.toUpperCase()} لا يستجيب (خطأ 522). الخادم الأصلي بطيء أو معطل. جرب لاحقاً أو استخدم مصدر آخر.\n\n` +
          `⏱️ ${source.toUpperCase()} not responding (Error 522). Origin server is slow or down. Try later or use different source.`;
      } else if (errorMsg.includes('CLOUDFLARE_GATEWAY_TIMEOUT') || errorMsg.includes('524')) {
        errorType = 'TIMEOUT_524';
        userFriendlyError = `⏱️ انتهت مهلة الاتصال مع ${source.toUpperCase()} (خطأ 524). الموقع بطيء جداً. جرب مصدر آخر.\n\n` +
          `⏱️ Connection timeout with ${source.toUpperCase()} (Error 524). Site is too slow. Try different source.`;
      } else if (errorMsg.includes('REQUEST_TIMEOUT') || errorMsg.includes('TIMEOUT')) {
        errorType = 'TIMEOUT';
        userFriendlyError = `⏱️ انتهت مهلة الطلب من ${source.toUpperCase()}. الموقع بطيء جداً أو لا يستجيب. جرب مصدر آخر.\n\n` +
          `⏱️ Request timeout from ${source.toUpperCase()}. Site is too slow or not responding. Try different source.`;
      } else if (errorMsg.includes('403')) {
        errorType = 'BLOCKED';
        userFriendlyError = `🚫 ${source.toUpperCase()} يحظر الوصول الآلي (خطأ 403). جرب مصدر آخر.\n\n` +
          `🚫 ${source.toUpperCase()} is blocking automated access (Error 403). Try different source.`;
      } else if (errorMsg.includes('503')) {
        errorType = 'UNAVAILABLE';
        userFriendlyError = `❌ ${source.toUpperCase()} غير متاح مؤقتاً (خطأ 503). جرب لاحقاً.\n\n` +
          `❌ ${source.toUpperCase()} temporarily unavailable (Error 503). Try again later.`;
      }
      
      console.error(`[Scrape] Error Type: ${errorType}`);
      
      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'failed', 
          error_message: userFriendlyError,
          completed_at: new Date().toISOString() 
        })
        .eq('id', job.id);

      throw new Error(userFriendlyError);
    }

  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error('[Main] ❌ Fatal Error:', errorMsg);
    
    return new Response(
      JSON.stringify({ 
        error: errorMsg,
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
