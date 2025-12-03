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
        title: ["h1.entry-title", ".post-title h1", "h1"],
        cover: [".summary_image img", "img.wp-post-image", ".tab-summary img"],
        description: [".summary__content p", ".description-summary p", ".manga-excerpt"],
        status: [".post-status .summary-content", ".summary-content", ".manga-status"],
        genres: [".genres-content a", ".manga-genres a", ".mgen a"],
        author: [".author-content", ".manga-author", ".artist-content a"],
        artist: [".artist-content", ".manga-artist"],
        rating: ["[itemprop='ratingValue']", ".post-total-rating .score", ".rating-prc"],
        chapters: ["li.wp-manga-chapter", ".chapter-item", ".listing-chapters_wrap li"],
        chapterTitle: ["a"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-release-date", "span.chapter-release-date"],
        pageImages: [".reading-content img", ".page-break img", "img.wp-manga-chapter-img", "#readerarea img"],
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
        title: [".author-info-title h1", "h1", ".manga-title", ".entry-title"],
        cover: [".whitebox img.shadow-sm", ".text-right img", "img[alt='Manga Image']", ".cover img"],
        description: [".review-author-info + div", ".description", ".summary", ".manga-description"],
        status: [".full-list-info small a[href*='status']", ".status", ".manga-status"],
        genres: [".review-author-info a.subtitle", "a[href*='genre']", ".genre a"],
        author: [".full-list-info small a[href*='author']", ".author"],
        artist: [".full-list-info:contains('الرسام') small a", ".full-list-info:contains('الرسام') small", ".artist"],
        rating: [".rating-avg-line", ".rating"],
        chapters: [".last-chapter .box", ".chapters li", ".chapter-list li"],
        chapterTitle: [".info h3 + ul a", ".info a", "a"],
        chapterUrl: [".info h3 a", ".imgu a", "a"],
        chapterDate: [".date", ".chapter-date"],
        pageImages: [".images img", ".chapter-content img", "img.chapter-img", ".reader img"],
        year: [".year", ".release-year"],
        catalogMangaCard: [".entry-box", ".swiper-slide .entry-box", ".box", ".manga-card"],
        catalogMangaLink: [".entry-image a", ".entry-title a", "a[href*='series']", "a"],
        catalogMangaCover: [".entry-image img", ".best-img", ".imgu img", "img"]
      }
    },
    "3asq": {
      baseUrl: "https://3asq.org",
      selectors: {
        title: [".post-title h1", "h1", ".entry-title"],
        cover: [".summary_image img", "img.img-responsive", ".tab-summary img", "img.wp-post-image"],
        description: [".manga-excerpt p", ".summary__content p", ".description-summary p"],
        status: [".post-content_item:contains('الحالة') .summary-content", ".summary-content"],
        genres: [".genres-content a", "a[href*='manga-genre']"],
        author: [".author-content a", "a[href*='manga-author']"],
        artist: [".artist-content a", "a[href*='manga-artist']"],
        rating: [".score", ".total_votes", "[itemprop='ratingValue']"],
        chapters: ["li.wp-manga-chapter", ".chapter-item", ".listing-chapters_wrap li"],
        chapterTitle: ["a", ".chapter-link"],
        chapterUrl: ["a"],
        chapterDate: [".chapter-release-date i", ".chapter-release-date", ".release-date"],
        pageImages: [".reading-content img", ".page-break img", "#readerarea img"],
        year: ["a[href*='manga-release']", ".release-year"],
        catalogMangaCard: [".page-item-detail", ".col-12.col-md-4", ".manga-item"],
        catalogMangaLink: [".item-thumb a", ".post-title a", "a[href*='/manga/']"],
        catalogMangaCover: [".item-thumb img", "img.img-responsive", "img"]
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
  for (const selector of selectors) {
    try {
      const element = doc.querySelector(selector);
      if (element) {
        if (type === 'text') {
          const text = element.textContent?.trim();
          if (text && text.length > 0) {
            console.log(`[Smart] Found with selector: ${selector}`);
            return text;
          }
        } else {
          const value = element.getAttribute(attr) || element.getAttribute('data-' + attr);
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
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const title = smartSelect(doc, config.selectors.title, 'text') || '';
  let cover = smartSelect(doc, config.selectors.cover, 'attr', 'src') || '';
  if (cover && !cover.startsWith('http')) {
    cover = cover.startsWith('//') ? 'https:' + cover : config.baseUrl + cover;
  }
  cover = cleanUrl(cover);
  
  // Try multiple selectors for description
  let description = '';
  for (const selector of config.selectors.description) {
    description = smartSelect(doc, selector, 'text') || '';
    if (description && description.length > 20) break;
  }
  
  // Additional fallback for description
  if (!description || description.length < 20) {
    const descEl = doc.querySelector('.summary__content, .description, .manga-excerpt, [itemprop="description"]');
    if (descEl) {
      description = descEl.textContent?.trim() || '';
    }
  }
  
  if (!description || description.length < 10) {
    description = 'لا يوجد وصف متاح';
  }
  
  console.log(`[Manga Info] Description extracted: ${description.substring(0, 100)}...`);
  
  const statusRaw = smartSelect(doc, config.selectors.status, 'text') || 'ongoing';
  const author = smartSelect(doc, config.selectors.author, 'text') || 'غير معروف';
  const artist = smartSelect(doc, config.selectors.artist, 'text') || '';
  
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

  const genres = smartExtractGenres(doc, config.selectors.genres);
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
    title,
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

  console.log(`[Manga Info] Success:`, { title, genres: genres.length, cover: !!uploadedCoverUrl });
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
  
  // Try each chapter selector
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
          
          // Try to find link
          for (const urlSelector of config.selectors.chapterUrl) {
            const linkEl = chapterEl.querySelector(urlSelector);
            if (linkEl) {
              chapterUrl = linkEl.getAttribute('href') || '';
              title = linkEl.textContent?.trim() || '';
              if (chapterUrl) break;
            }
          }
          
          if (!chapterUrl) continue;
          
          // Extract chapter number
          let chapterNumber = 0;
          const numMatch = title.match(/(\d+\.?\d*)/);
          if (numMatch) {
            chapterNumber = parseFloat(numMatch[1]);
          } else {
            const urlMatch = chapterUrl.match(/(\d+\.?\d*)/);
            chapterNumber = urlMatch ? parseFloat(urlMatch[1]) : chapterElements.length - i;
          }

          // Find date
          let dateText = '';
          for (const dateSelector of config.selectors.chapterDate) {
            const dateEl = chapterEl.querySelector(dateSelector);
            if (dateEl) {
              dateText = dateEl.textContent?.trim() || '';
              if (dateText) break;
            }
          }

          // Convert date to ISO format
          const releaseDate = parseArabicDate(dateText);
          
          chapters.push({
            chapter_number: chapterNumber,
            title: title || `Chapter ${chapterNumber}`,
            source_url: chapterUrl.startsWith('http') ? chapterUrl : config.baseUrl + chapterUrl,
            release_date: releaseDate,
          });
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

// Helper function to download and upload image to Supabase Storage
async function downloadAndUploadImage(imageUrl: string, supabase: any, bucket: string, path: string): Promise<string | null> {
  try {
    console.log(`[Storage] Downloading image: ${imageUrl}`);
    
    const response = await fetch(imageUrl, {
      headers: getBrowserHeaders()
    });
    
    if (!response.ok) {
      console.error(`[Storage] Failed to download image: ${response.status}`);
      return null;
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, uint8Array, {
        contentType,
        upsert: true
      });
    
    if (error) {
      console.error(`[Storage] Upload error:`, error);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    console.log(`[Storage] ✓ Uploaded successfully`);
    return publicUrl;
  } catch (error: any) {
    console.error(`[Storage] Error:`, error?.message || error);
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
  
  console.log(`[Pages] Processing ${allImages.length} images...`);
  
  // Process ALL images without limit
  for (let index = 0; index < allImages.length; index++) {
    const img = allImages[index] as any;
    let imageUrl = img.getAttribute('src') || 
                   img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') ||
                   img.getAttribute('data-original') || '';
    
    if (imageUrl) {
      // Clean URL from whitespace, tabs, newlines
      imageUrl = cleanUrl(imageUrl);
      
      // Fix URL construction - don't add baseUrl if already absolute
      if (!imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = config.baseUrl + imageUrl;
        } else {
          // Relative path without leading slash
          imageUrl = config.baseUrl + '/' + imageUrl;
        }
      }
      
      console.log(`[Pages] Processing page ${index + 1}/${allImages.length}: ${imageUrl.substring(0, 60)}...`);
      
      // Download and upload to storage
      const fileName = `${chapterId}/page-${index + 1}.jpg`;
      const uploadedUrl = await downloadAndUploadImage(imageUrl, supabase, 'chapter-pages', fileName);
      
      if (uploadedUrl) {
        pages.push({
          page_number: index + 1,
          image_url: uploadedUrl,
        });
        console.log(`[Pages] ✓ Uploaded page ${index + 1}/${allImages.length}`);
      } else {
        console.error(`[Pages] ✗ Failed to upload page ${index + 1}`);
      }
    }
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
        if (jobType === 'chapters') {
          chaptersData = await scrapeChapters(url, source, supabase);
          
          let savedCount = 0;
          // Save chapter metadata only (NOT pages - to avoid timeout)
          for (const chapter of chaptersData) {
            // Check timeout before processing each chapter
            if (isNearTimeout()) {
              console.log(`[Chapters] ⚠️ Timeout approaching, saved ${savedCount}/${chaptersData.length} chapters`);
              break;
            }
            
            const { error: chapterError } = await supabase
              .from('chapters')
              .upsert({ ...chapter, manga_id: manga.id }, { onConflict: 'manga_id,chapter_number' });
            
            if (!chapterError) {
              savedCount++;
            } else {
              console.error(`[Chapters] Error saving chapter ${chapter.chapter_number}:`, chapterError);
            }
          }
          
          // Update chapter count
          await supabase
            .from('manga')
            .update({ chapter_count: savedCount })
            .eq('id', manga.id);
          
          console.log(`[Chapters] ✓ Saved ${savedCount} chapters (metadata only)`);
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
            chaptersCount: chaptersData.length 
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
