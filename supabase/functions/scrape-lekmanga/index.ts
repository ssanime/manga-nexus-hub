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

// Smart selector configurations with multiple fallbacks
const SCRAPER_CONFIGS: Record<string, {
  baseUrl: string;
  selectors: {
    title: string[];
    cover: string[];
    description: string[];
    status: string[];
    genres: string[];
    author: string[];
    artist: string[];
    chapters: string[];
    chapterTitle: string[];
    chapterUrl: string[];
    chapterDate: string[];
    pageImages: string[];
    year?: string[];
    catalogMangaCard?: string[];
    catalogMangaLink?: string[];
    catalogMangaCover?: string[];
  };
}> = {
  "onma": {
    baseUrl: "https://www.onma.top",
    selectors: {
      title: [".panel-heading", "h1", ".title", ".manga-title"],
      cover: ["img.img-responsive", ".thumbnail img", ".manga-cover img", "img[alt]"],
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
      catalogMangaCard: [".photo", ".manga-card", ".item", ".manga-item"],
      catalogMangaLink: [".manga-name a", "a", ".title a", ".manga-link"],
      catalogMangaCover: [".thumbnail img", "img", ".cover img", ".manga-cover"]
    }
  },
  "lekmanga": {
    baseUrl: "https://lekmanga.net",
    selectors: {
      title: ["h1.entry-title", ".post-title", "h1"],
      cover: [".summary_image img", "img.wp-post-image", ".manga-cover img"],
      description: [".summary__content", ".description-summary", ".manga-excerpt"],
      status: [".post-status .summary-content", ".manga-status"],
      genres: [".genres-content a", ".manga-genres a"],
      author: [".author-content", ".manga-author"],
      artist: [".artist-content", ".manga-artist"],
      chapters: ["li.wp-manga-chapter", ".chapter-item"],
      chapterTitle: ["a"],
      chapterUrl: ["a"],
      chapterDate: [".chapter-release-date"],
      pageImages: [".reading-content img", "img.wp-manga-chapter-img", ".page-break img"],
      catalogMangaCard: [".page-item-detail", ".manga-item"],
      catalogMangaLink: ["a"],
      catalogMangaCover: ["img"]
    }
  },
  "azoramoon": {
    baseUrl: "https://azoramoon.com",
    selectors: {
      title: [".post-title h1", "h1.entry-title", ".series-title", "h1"],
      cover: [".series-thumb img", ".summary_image img", "img.wp-post-image", ".cover img"],
      description: [".series-synops", ".summary__content", ".description", ".manga-description"],
      status: [".status .summary-content", ".series-status", ".manga-status"],
      genres: [".series-genres a", ".genres-content a", "a[rel='tag']"],
      author: [".author-content", ".series-author"],
      artist: [".artist-content", ".series-artist"],
      chapters: ["li.wp-manga-chapter", ".chapter-item", ".eplister ul li"],
      chapterTitle: ["a", ".chapternum"],
      chapterUrl: ["a"],
      chapterDate: [".chapter-release-date", ".chapterdate"],
      pageImages: ["#readerarea img", ".reading-content img", "img.wp-manga-chapter-img"],
      year: [".year", ".release-year"],
      catalogMangaCard: [".bs", ".listupd .bsx", ".page-item-detail"],
      catalogMangaLink: ["a", ".bsx a"],
      catalogMangaCover: ["img"]
    }
  }
};

const MAX_RETRIES = 6;
const BASE_DELAY = 4000;
const CLOUDFLARE_RETRY_DELAY = 12000;
const FETCH_TIMEOUT = 30000; // 30 seconds timeout

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(): Promise<void> {
  await delay(getRandomDelay(1000, 3000));
}

// Smart HTML fetcher with enhanced anti-bot evasion and timeout handling
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
        console.error('[Fetch] 403 Forbidden - Cloudflare or anti-bot protection active');
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
    
    // Advanced Cloudflare detection
    const cfPatterns = [
      'cf-browser-verification',
      'challenge-platform', 
      'cf_challenge',
      'just a moment',
      'checking your browser',
      'cloudflare',
      'ray id',
      '__cf_chl_jschl_tk__'
    ];
    
    const lowerHtml = html.toLowerCase();
    const detectedPatterns = cfPatterns.filter(p => lowerHtml.includes(p));
    
    if (detectedPatterns.length > 0) {
      console.error(`[Fetch] Cloudflare detected: ${detectedPatterns.join(', ')}`);
      throw new Error('CLOUDFLARE_CHALLENGE');
    }
    
    // Check for actual content
    if (html.length < 500) {
      console.error(`[Fetch] Response too short: ${html.length} bytes`);
      throw new Error('EMPTY_RESPONSE');
    }
    
    // Verify we got HTML content
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      console.error('[Fetch] Response does not appear to be HTML');
      throw new Error('INVALID_HTML');
    }
    
    console.log(`[Fetch] ✓ Success: ${html.length} bytes, appears valid`);
    return html;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[Fetch] Error on attempt ${retryCount + 1}:`, errorMsg);
    
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

function extractSlug(url: string): string {
  const match = url.match(/\/manga\/([^\/\?#]+)/);
  return match ? match[1] : '';
}

async function scrapeMangaInfo(url: string, source: string) {
  console.log(`[Manga Info] 📖 Starting scrape from ${source.toUpperCase()}: ${url}`);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) throw new Error(`Unknown source: ${source}`);

  const html = await fetchHTML(url, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const title = smartSelect(doc, config.selectors.title, 'text') || '';
  let cover = smartSelect(doc, config.selectors.cover, 'attr', 'src') || '';
  if (cover && !cover.startsWith('http')) {
    cover = cover.startsWith('//') ? 'https:' + cover : config.baseUrl + cover;
  }
  
  const description = smartSelect(doc, config.selectors.description, 'text') || '';
  const statusRaw = smartSelect(doc, config.selectors.status, 'text') || 'ongoing';
  const author = smartSelect(doc, config.selectors.author, 'text') || '';
  const artist = smartSelect(doc, config.selectors.artist, 'text') || '';
  
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

  const mangaData = {
    title,
    slug,
    description,
    cover_url: cover,
    status: (statusRaw.toLowerCase().includes('ongoing') || statusRaw.includes('مستمر')) ? 'ongoing' : 'completed',
    genres: genres.length > 0 ? genres : null,
    author: author || null,
    artist: artist || null,
    year,
    source_url: url,
    source,
  };

  console.log(`[Manga Info] Success:`, { title, genres: genres.length, cover: !!cover });
  return mangaData;
}

async function scrapeChapters(mangaUrl: string, source: string) {
  console.log(`[Chapters] 📚 Starting scrape from ${source.toUpperCase()}: ${mangaUrl}`);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) throw new Error(`Unknown source: ${source}`);

  const html = await fetchHTML(mangaUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const chapters: any[] = [];
  
  // Try each chapter selector
  for (const chapterSelector of config.selectors.chapters) {
    const chapterElements = doc.querySelectorAll(chapterSelector);
    if (chapterElements.length > 0) {
      console.log(`[Chapters] Found ${chapterElements.length} chapters with: ${chapterSelector}`);
      
      chapterElements.forEach((chapterEl: any, index: number) => {
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
          
          if (!chapterUrl) return;
          
          // Extract chapter number
          let chapterNumber = 0;
          const numMatch = title.match(/(\d+\.?\d*)/);
          if (numMatch) {
            chapterNumber = parseFloat(numMatch[1]);
          } else {
            const urlMatch = chapterUrl.match(/(\d+\.?\d*)/);
            chapterNumber = urlMatch ? parseFloat(urlMatch[1]) : chapterElements.length - index;
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

          chapters.push({
            chapter_number: chapterNumber,
            title: title || `Chapter ${chapterNumber}`,
            source_url: chapterUrl.startsWith('http') ? chapterUrl : config.baseUrl + chapterUrl,
            release_date: dateText || null,
          });
        } catch (e: any) {
          console.error(`[Chapters] Error processing chapter:`, e?.message || e);
        }
      });
      
      break; // Found chapters, stop trying other selectors
    }
  }

  console.log(`[Chapters] Success: ${chapters.length} chapters`);
  return chapters;
}

async function scrapeChapterPages(chapterUrl: string, source: string) {
  console.log(`[Pages] Starting scrape: ${source} - ${chapterUrl}`);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) throw new Error(`Unknown source: ${source}`);

  const html = await fetchHTML(chapterUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const pages: any[] = [];
  
  for (const imageSelector of config.selectors.pageImages) {
    const imageElements = doc.querySelectorAll(imageSelector);
    if (imageElements.length > 0) {
      console.log(`[Pages] Found ${imageElements.length} images with: ${imageSelector}`);
      
      imageElements.forEach((img: any, index: number) => {
        let imageUrl = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
        
        if (imageUrl) {
          if (!imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 'https:' + imageUrl : config.baseUrl + imageUrl;
          }
          
          pages.push({
            page_number: index + 1,
            image_url: imageUrl,
          });
        }
      });
      
      break;
    }
  }

  console.log(`[Pages] Success: ${pages.length} pages`);
  return pages;
}

async function scrapeCatalog(source: string, limit = 20) {
  console.log(`[Catalog] 📑 Starting scrape from ${source.toUpperCase()} - limit ${limit}`);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) throw new Error(`Unknown source: ${source}`);

  const html = await fetchHTML(config.baseUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Failed to parse HTML');

  const mangaUrls: string[] = [];
  
  if (config.selectors.catalogMangaCard) {
    for (const cardSelector of config.selectors.catalogMangaCard) {
      const cards = doc.querySelectorAll(cardSelector);
      if (cards.length > 0) {
        console.log(`[Catalog] Found ${cards.length} manga cards with: ${cardSelector}`);
        
        cards.forEach((card: any) => {
          if (mangaUrls.length >= limit) return;
          
          for (const linkSelector of config.selectors.catalogMangaLink || ['a']) {
            const link = card.querySelector(linkSelector);
            if (link) {
              let href = link.getAttribute('href') || '';
              if (href && !href.includes('javascript:')) {
                href = href.startsWith('http') ? href : config.baseUrl + href;
                if (href.includes('/manga/')) {
                  mangaUrls.push(href);
                  break;
                }
              }
            }
          }
        });
        
        break;
      }
    }
  }

  console.log(`[Catalog] Success: ${mangaUrls.length} manga URLs`);
  return mangaUrls;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
        const mangaUrls = await scrapeCatalog(source, limit);
        
        await supabase
          .from('scrape_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ success: true, mangaUrls, count: mangaUrls.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (jobType === 'manga_info' || jobType === 'chapters') {
        const mangaInfo = await scrapeMangaInfo(url, source);
        
        const { data: manga, error: mangaError } = await supabase
          .from('manga')
          .upsert(mangaInfo, { onConflict: 'source_url' })
          .select()
          .single();

        if (mangaError) throw mangaError;

        let chaptersData = [];
        if (jobType === 'chapters') {
          chaptersData = await scrapeChapters(url, source);
          
          for (const chapter of chaptersData) {
            await supabase
              .from('chapters')
              .upsert({ ...chapter, manga_id: manga.id }, { onConflict: 'manga_id,chapter_number' });
          }
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
        const pages = await scrapeChapterPages(url, source);
        
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
