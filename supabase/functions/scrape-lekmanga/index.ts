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
        title: [".post-title h1", "h1", ".c-breadcrumb li:last-child a"],
        cover: [".summary_image img", ".summary_image a img", "img.img-responsive", ".tab-summary img"],
        description: [".summary__content p", ".description-summary .summary__content p", ".description-summary p"],
        status: [".post-status .post-content_item .summary-content", ".post-status .summary-content"],
        genres: [".genres-content a", ".tags-content a", "a[rel='tag']"],
        author: [".author-content", ".post-content_item .author-content"],
        artist: [".artist-content", ".post-content_item .artist-content"],
        rating: ["#averagerate", ".score.font-meta.total_votes", "[property='ratingValue']", ".post-total-rating .score"],
        chapters: ["ul.main.version-chap li.wp-manga-chapter", "li.wp-manga-chapter", ".listing-chapters_wrap ul li"],
        chapterTitle: ["a"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-release-date i", ".chapter-release-date", "span.chapter-release-date i"],
        pageImages: [".reading-content img", ".page-break img", "img.wp-manga-chapter-img", "#image-container img"],
        catalogMangaCard: [".page-item-detail", ".manga-item", ".c-tabs-item__content"],
        catalogMangaLink: ["a"],
        catalogMangaCover: ["img"]
      }
    },
    "azoramoon": {
      baseUrl: "https://azoramoon.com",
      selectors: {
        title: [".post-title h1", "h1.entry-title", ".series-title", ".entry-title", "h1"],
        cover: [".series-thumb img", ".summary_image img", "img.wp-post-image", ".thumb img", ".cover img"],
        description: [".entry-content[itemprop='description'] p", ".series-synops", ".summary__content p", ".description", ".manga-description"],
        status: [".status .summary-content", ".series-status", ".spe span:last-child", ".manga-status"],
        genres: [".series-genres a", ".genres-content a", ".mgen a", "a[rel='tag']"],
        author: [".author-content", ".series-author", ".fmed b", ".author"],
        artist: [".artist-content", ".series-artist", ".artist"],
        rating: [".num[itemprop='ratingValue']", ".rating .num", ".series-rating", "[itemprop='ratingValue']"],
        chapters: [".eplister ul li", "li.wp-manga-chapter", ".chapter-item"],
        chapterTitle: ["a .chapternum", "a", ".chapternum"],
        chapterUrl: ["a"],
        chapterDate: [".chapterdate", ".chapter-release-date"],
        pageImages: ["#readerarea img", ".rdminimal img", ".reading-content img", "img.wp-manga-chapter-img"],
        year: [".fmed:contains('Released') b", ".year", ".release-year"],
        catalogMangaCard: [".bs", ".bsx", ".listupd .bs", ".listupd article", ".page-item-detail"],
        catalogMangaLink: [".bsx a", "a"],
        catalogMangaCover: [".limit img", "img"]
      }
    },
    "olympustaff": {
      baseUrl: "https://olympustaff.com",
      selectors: {
        title: [".author-info-title h1", ".series-title", "h1.text-white", "h1", ".manga-title"],
        cover: [".whitebox img.shadow-sm", ".series-thumb img", ".text-right img", "img[alt*='Manga']", ".cover img", "img.img-fluid"],
        description: [".review-author-info", ".series-synops", ".description p", ".manga-description", ".summary p"],
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
    // NEW: Lavatoons.com - Madara WordPress Theme with eplister chapters
    "lavatoons": {
      baseUrl: "https://lavatoons.com",
      selectors: {
        // معلومات المانجا - Madara Theme
        title: [".post-title h1", "h1", ".entry-title", ".manga-title"],
        cover: [".summary_image img", ".summary_image a img", "img.img-responsive", ".tab-summary img", "meta[property='og:image']"],
        description: [".description-summary .summary__content", ".manga-excerpt", ".summary__content p", ".entry-content p"],
        status: [".post-content_item:contains('الحالة') .summary-content", ".post-status .summary-content", ".status"],
        genres: [".genres-content a", ".tags-content a", "a[rel='tag']", ".mgen a"],
        author: [".author-content a", ".author-content", "a[href*='manga-author']"],
        artist: [".artist-content a", ".artist-content", "a[href*='manga-artist']"],
        rating: [".score", ".post-total-rating .score", "[property='ratingValue']", "#averagerate"],
        // قائمة الفصول - eplister style (lavatoons specific)
        chapters: ["#chapterlist ul li[data-num]", ".eplister ul li[data-num]", ".eplister ul li", "li.wp-manga-chapter", "ul.main.version-chap li"],
        chapterTitle: ["span.chapternum", ".chapternum", "a", ".chapter-manhwa-title"],
        chapterUrl: ["a"],
        chapterDate: ["span.chapterdate", ".chapterdate", ".chapter-release-date i", ".chapter-release-date"],
        // صور الفصل - ts-main-image class specific to lavatoons reader
        pageImages: ["#readerarea img.ts-main-image", "#readerarea img", "img.ts-main-image", ".reading-content img", ".page-break img", "img.wp-manga-chapter-img"],
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
        chapters: ["#chapterlist ul li[data-num]", ".eplister ul li[data-num]", "li.wp-manga-chapter"],
        chapterTitle: ["span.chapternum", ".chapternum", "a"],
        chapterUrl: ["a"],
        chapterDate: ["span.chapterdate", ".chapterdate", ".chapter-release-date i"],
        pageImages: ["#readerarea img.ts-main-image", "#readerarea img", "img.ts-main-image", ".reading-content img", ".page-break img"],
        catalogMangaCard: [".page-item-detail", ".manga-item"],
        catalogMangaLink: [".item-thumb a", ".post-title a"],
        catalogMangaCover: [".item-thumb img", "img"]
      }
    }
  };
  
  return FALLBACK_CONFIGS[sourceName.toLowerCase()] || null;
}

const MAX_RETRIES = 3; // Reduced retries
const BASE_DELAY = 3000;
const CLOUDFLARE_RETRY_DELAY = 8000;
const FETCH_TIMEOUT = 25000; // 25 seconds
const FUNCTION_TIMEOUT = 50000; // 50 seconds max execution

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(): Promise<void> {
  await delay(getRandomDelay(1000, 3000));
}

// Smart HTML fetcher with enhanced anti-bot evasion and Cloudflare bypass integration
async function fetchHTML(url: string, config: any, retryCount = 0): Promise<string> {
  try {
    console.log(`[Fetch] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}: ${url}`);
    
    // Longer delays between retries to appear more human
    await delay(getRandomDelay(2000, 5000));
    
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
      if (response.status === 403) {
        console.error('[Fetch] 403 Forbidden - Trying Cloudflare bypass...');
        throw new Error('CLOUDFLARE_BLOCK');
      }
      if (response.status === 503) {
        console.error('[Fetch] 503 Service Unavailable - Site may be down or blocking');
        throw new Error('SERVICE_UNAVAILABLE');
      }
      if (response.status === 522) {
        console.error('[Fetch] 522 Connection Timed Out - Origin server not responding');
        throw new Error('ORIGIN_TIMEOUT');
      }
      if (response.status === 524) {
        console.error('[Fetch] 524 Timeout - Cloudflare timeout waiting for origin');
        throw new Error('CLOUDFLARE_TIMEOUT');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Enhanced Cloudflare detection
    const cfHeaders = response.headers.get('cf-ray') || 
                     response.headers.get('cf-cache-status') ||
                     response.headers.get('server')?.toLowerCase().includes('cloudflare');
    
    const lowerHtml = html.toLowerCase();
    
    const strongChallengeIndicators = [
      'cf-browser-verification',
      '__cf_chl_jschl_tk__',
      'cf-challenge-running',
      'cf_chl_opt'
    ];
    
    const isChallengeTitle = lowerHtml.includes('<title>just a moment') || 
                            lowerHtml.includes('<title>attention required');
    
    const hasChallengeContent = (
      lowerHtml.includes('enable javascript and cookies to continue') ||
      lowerHtml.includes('checking if the site connection is secure') ||
      lowerHtml.includes('checking your browser before accessing')
    );
    
    const strongIndicatorsCount = strongChallengeIndicators.filter(p => lowerHtml.includes(p)).length;
    const hasRayIdInError = /ray id: [a-f0-9]{16}/.test(lowerHtml);
    
      // Improved Cloudflare detection - more accurate
      const isActualChallenge = (
        isChallengeTitle ||
        (strongIndicatorsCount >= 2) ||
        (hasChallengeContent && cfHeaders && strongIndicatorsCount >= 1) ||
        (hasRayIdInError && hasChallengeContent && cfHeaders)
      );
    
    if (isActualChallenge) {
      console.error(`[Fetch] Cloudflare challenge detected - attempting bypass...`);
      throw new Error('CLOUDFLARE_CHALLENGE');
    }
    
    // Check for actual content
    if (html.length < 500) {
      console.error(`[Fetch] Response too short: ${html.length} bytes`);
      throw new Error('EMPTY_RESPONSE');
    }
    
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      console.error('[Fetch] Response does not appear to be HTML');
      throw new Error('INVALID_HTML');
    }
    
    console.log(`[Fetch] ✓ Success: ${html.length} bytes, appears valid`);
    return html;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[Fetch] Error on attempt ${retryCount + 1}:`, errorMsg);
    
    // Try Cloudflare bypass for specific errors
    if ((errorMsg === 'CLOUDFLARE_BLOCK' || errorMsg === 'CLOUDFLARE_CHALLENGE') && retryCount === 0) {
      console.log('[Fetch] Attempting Cloudflare bypass via edge function...');
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        const bypassResponse = await fetch(`${supabaseUrl}/functions/v1/cloudflare-bypass`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ url }),
        });
        
        const bypassData = await bypassResponse.json();
        
        if (bypassData.success && bypassData.html) {
          console.log('[Fetch] ✓ Cloudflare bypass successful!');
          return bypassData.html;
        } else {
          console.error('[Fetch] Cloudflare bypass failed:', bypassData.error);
        }
      } catch (bypassError) {
        console.error('[Fetch] Bypass error:', bypassError);
      }
    }
    
    // Handle AbortError (timeout)
    if (error.name === 'AbortError') {
      console.error(`[Fetch] Request timeout after ${FETCH_TIMEOUT}ms`);
      if (retryCount < MAX_RETRIES) {
        const delayMs = BASE_DELAY * Math.pow(2, retryCount) + getRandomDelay(2000, 4000);
        console.log(`[Fetch] ⏳ Timeout occurred, retrying after ${delayMs}ms...`);
        await delay(delayMs);
        return fetchHTML(url, config, retryCount + 1);
      }
      throw new Error('REQUEST_TIMEOUT');
    }
    
    if (retryCount < MAX_RETRIES) {
      let delayMs = BASE_DELAY * Math.pow(2, retryCount) + getRandomDelay(1000, 3000);
      
      // Longer delays for specific error types
      if (errorMsg.includes('CLOUDFLARE')) {
        delayMs = CLOUDFLARE_RETRY_DELAY + getRandomDelay(3000, 6000);
        console.log(`[Fetch] ⏳ Cloudflare detected, waiting ${delayMs}ms before retry...`);
      } else if (errorMsg.includes('TIMEOUT') || errorMsg.includes('522') || errorMsg.includes('524')) {
        delayMs = BASE_DELAY * Math.pow(2, retryCount + 1) + getRandomDelay(3000, 7000);
        console.log(`[Fetch] ⏳ Timeout/522/524 error, waiting ${delayMs}ms before retry...`);
      } else {
        console.log(`[Fetch] ⏳ Retrying after ${delayMs}ms...`);
      }
      
      await delay(delayMs);
      return fetchHTML(url, config, retryCount + 1);
    }
    
    // Provide user-friendly error messages
    if (errorMsg.includes('CLOUDFLARE')) {
      throw new Error('CLOUDFLARE_PROTECTION');
    } else if (errorMsg.includes('TIMEOUT') || errorMsg.includes('REQUEST_TIMEOUT')) {
      throw new Error('REQUEST_TIMEOUT');
    } else if (errorMsg.includes('ORIGIN_TIMEOUT') || errorMsg.includes('522')) {
      throw new Error('ORIGIN_SERVER_TIMEOUT');
    } else if (errorMsg.includes('524')) {
      throw new Error('CLOUDFLARE_GATEWAY_TIMEOUT');
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
  return url.replace(/[\s\t\n\r]+/g, '').trim();
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
  
  // Special handling for lavatoons - eplister chapters with data-num
  if (sourceLower === 'lavatoons' || sourceLower === 'lavatoons.com') {
    console.log(`[Chapters] Using lavatoons eplister chapter extraction method`);
    
    // Try eplister selectors - lavatoons uses li[data-num] structure
    const eplisterSelectors = [
      '#chapterlist ul li[data-num]',
      '.eplister ul li[data-num]',
      'div.eplister ul li',
      '#chapterlist li'
    ];
    
    for (const selector of eplisterSelectors) {
      const chapterElements = doc.querySelectorAll(selector);
      if (chapterElements.length > 0) {
        console.log(`[Chapters] Found ${chapterElements.length} chapters with: ${selector}`);
        
        for (let i = 0; i < chapterElements.length; i++) {
          const chapterEl = chapterElements[i] as any;
          try {
            // Get chapter number from data-num attribute
            const dataNum = chapterEl.getAttribute('data-num');
            let chapterNumber = dataNum ? parseFloat(dataNum) : 0;
            
            // Get URL from anchor tag
            const linkEl = chapterEl.querySelector('a');
            let chapterUrl = linkEl?.getAttribute('href') || '';
            
            if (!chapterUrl) {
              console.log(`[Chapters] ⚠️ No URL for chapter ${dataNum}`);
              continue;
            }
            
            // Get title from span.chapternum
            let title = '';
            const chapterNumEl = chapterEl.querySelector('span.chapternum, .chapternum');
            if (chapterNumEl) {
              title = chapterNumEl.textContent?.trim().replace(/\s+/g, ' ') || '';
            }
            
            // Extract chapter number from title if not in data-num
            if (chapterNumber === 0 && title) {
              const numMatch = title.match(/(\d+\.?\d*)/);
              if (numMatch) {
                chapterNumber = parseFloat(numMatch[1]);
              }
            }
            
            // Fallback: extract from URL
            if (chapterNumber === 0) {
              const urlMatch = chapterUrl.match(/chapter[_-]?(\d+\.?\d*)/i);
              if (urlMatch) {
                chapterNumber = parseFloat(urlMatch[1]);
              }
            }
            
            // Get date from span.chapterdate
            let dateText = '';
            const dateEl = chapterEl.querySelector('span.chapterdate, .chapterdate');
            if (dateEl) {
              dateText = dateEl.textContent?.trim() || '';
            }
            
            const releaseDate = parseArabicDate(dateText);
            
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
            
            chapters.push({
              chapter_number: chapterNumber || (chapterElements.length - i),
              title: title || `الفصل ${chapterNumber}`,
              source_url: chapterUrl,
              release_date: releaseDate,
            });
            
            console.log(`[Chapters] ✓ Chapter ${chapterNumber}: ${title?.substring(0, 30) || 'N/A'}`);
          } catch (e: any) {
            console.error(`[Chapters] Error processing lavatoons chapter ${i + 1}:`, e?.message || e);
          }
        }
        
        break; // Found chapters
      }
    }
    
    if (chapters.length > 0) {
      chapters.sort((a, b) => a.chapter_number - b.chapter_number);
      console.log(`[Chapters] Success: ${chapters.length} chapters for lavatoons`);
      return chapters;
    }
    
    console.log(`[Chapters] ⚠️ No eplister chapters found, trying standard selectors...`);
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
async function downloadAndUploadImage(imageUrl: string, supabase: any, bucket: string, path: string): Promise<string | null> {
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per image
    
    const response = await fetch(imageUrl, {
      headers: getBrowserHeaders(),
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

  const html = await fetchHTML(chapterUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const pages: any[] = [];
  
  // Try all image selectors and collect ALL images
  let allImages: any[] = [];
  
  for (const imageSelector of config.selectors.pageImages) {
    const imageElements = doc.querySelectorAll(imageSelector);
    if (imageElements.length > 0) {
      console.log(`[Pages] Found ${imageElements.length} images with: ${imageSelector}`);
      allImages = Array.from(imageElements);
      break; // Use first selector that finds images
    }
  }
  
  if (allImages.length === 0) {
    console.warn('[Pages] No images found with any selector');
    return pages;
  }
  
  console.log(`[Pages] Processing ${allImages.length} images sequentially...`);
  
  // Process images ONE BY ONE to prevent memory exhaustion
  const MAX_PAGES = 60; // Limit to prevent timeout
  const imagesToProcess = Math.min(allImages.length, MAX_PAGES);
  
  for (let index = 0; index < imagesToProcess; index++) {
    const img = allImages[index] as any;
    let imageUrl = img.getAttribute('src') || 
                   img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') ||
                   img.getAttribute('data-original') || '';
    
    if (imageUrl) {
      imageUrl = cleanUrl(imageUrl);
      
      if (!imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = config.baseUrl + imageUrl;
        } else {
          imageUrl = config.baseUrl + '/' + imageUrl;
        }
      }
      
      console.log(`[Pages] ${index + 1}/${imagesToProcess}: ${imageUrl.substring(0, 50)}...`);
      
      const fileName = `${chapterId}/page-${index + 1}.jpg`;
      const uploadedUrl = await downloadAndUploadImage(imageUrl, supabase, 'chapter-pages', fileName);
      
      if (uploadedUrl) {
        pages.push({
          page_number: index + 1,
          image_url: uploadedUrl,
        });
      }
    }
  }
  
  if (allImages.length > MAX_PAGES) {
    console.log(`[Pages] ⚠️ Limited to ${MAX_PAGES}/${allImages.length} pages`);
  }

  console.log(`[Pages] Success: ${pages.length} pages`);
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
