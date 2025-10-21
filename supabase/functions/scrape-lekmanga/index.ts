import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeMangaRequest {
  url: string;
  jobType: "manga_info" | "chapters" | "pages";
  chapterId?: string;
  source?: string;
}

// Advanced User-Agents with realistic browser fingerprints
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

// TLS Fingerprint simulation data
const TLS_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBaseHeaders(): HeadersInit {
  const ua = getRandomUserAgent();
  const isChrome = ua.includes('Chrome') && !ua.includes('Edg');
  const isFirefox = ua.includes('Firefox');
  const isSafari = ua.includes('Safari') && !ua.includes('Chrome');
  const isEdge = ua.includes('Edg');

  const headers: HeadersInit = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
  };

  // Add browser-specific headers
  if (isChrome || isEdge) {
    headers['sec-ch-ua'] = '"Chromium";v="131", "Not_A Brand";v="24"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
    headers['sec-ch-ua-platform-version'] = '"15.0.0"';
  }

  // Randomly add optional headers to look more realistic
  if (Math.random() > 0.5) {
    headers['Pragma'] = 'no-cache';
  }

  return headers;
}

// Configuration for different sources
const SCRAPER_CONFIGS: Record<string, {
  baseUrl: string;
  selectors: {
    title: string;
    cover: string;
    description: string;
    status: string;
    genres: string;
    author: string;
    artist: string;
    chapters: string;
    chapterTitle: string;
    chapterUrl: string;
    chapterDate: string;
    pageImages: string;
  };
}> = {
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
    baseUrl: "https://onma.top",
    selectors: {
      title: "h1.manga-title, .title",
      cover: ".manga-cover img, img.cover",
      description: ".manga-description, .summary",
      status: ".manga-status, .status",
      genres: ".genres a, .tags a",
      author: ".author",
      artist: ".artist",
      chapters: ".chapter-item, .chapters-list li",
      chapterTitle: "a, .chapter-title",
      chapterUrl: "a",
      chapterDate: ".chapter-date, .date",
      pageImages: ".manga-reader img, .page-image"
    }
  }
};

// Retry configuration with exponential backoff
const MAX_RETRIES = 5;
const BASE_DELAY = 3000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulate human-like delays
async function humanDelay(): Promise<void> {
  const baseDelay = getRandomDelay(2000, 5000);
  const jitter = getRandomDelay(-500, 500);
  await delay(baseDelay + jitter);
}

async function fetchWithRetry(url: string, config: typeof SCRAPER_CONFIGS['lekmanga'], retryCount = 0): Promise<string> {
  try {
    console.log(`Fetching ${url} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    // Human-like delay before each request
    await humanDelay();
    
    const headers = getBaseHeaders();
    
    // Add specific headers for the request
    const requestHeaders: HeadersInit = {
      ...headers,
      'Referer': retryCount > 0 ? config.baseUrl : url,
      'Origin': config.baseUrl,
    };

    // On retry, add cookies from previous attempts
    if (retryCount > 0) {
      requestHeaders['Cookie'] = '__cf_bm=dummy; cf_clearance=dummy';
    }

    console.log(`Using User-Agent: ${requestHeaders['User-Agent']}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      redirect: 'follow',
    });

    console.log(`Response status: ${response.status}`);
    
    // Store cookies from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      console.log('Received cookies from server');
    }
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(`Cloudflare challenge detected (403) - Need browser verification`);
      }
      if (response.status === 503) {
        throw new Error(`Service unavailable (503) - Rate limited or maintenance`);
      }
      if (response.status === 429) {
        throw new Error(`Too many requests (429) - Rate limited`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Check for Cloudflare challenge patterns
    const cloudflarePatterns = [
      'challenge-platform',
      'cf-browser-verification',
      'cf_challenge_response',
      'cf-chl-bypass',
      '__cf_chl_',
      'ray_id',
      'cf-error-details',
    ];
    
    const hasCloudflareChallenge = cloudflarePatterns.some(pattern => 
      html.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (hasCloudflareChallenge) {
      throw new Error('Cloudflare challenge page detected in response');
    }
    
    // Check if we got actual content
    if (html.length < 500) {
      throw new Error('Response too short - likely blocked');
    }
    
    console.log(`Successfully fetched ${html.length} bytes`);
    return html;
  } catch (error) {
    console.error(`Fetch error (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      // Exponential backoff with jitter
      const exponentialDelay = BASE_DELAY * Math.pow(2, retryCount);
      const jitter = getRandomDelay(-1000, 1000);
      const delayMs = exponentialDelay + jitter;
      
      console.log(`Retrying after ${delayMs}ms...`);
      await delay(delayMs);
      return fetchWithRetry(url, config, retryCount + 1);
    }
    
    throw error;
  }
}

function extractSlug(url: string): string {
  const match = url.match(/\/manga\/([^\/]+)/);
  return match ? match[1] : '';
}

function tryMultipleSelectors(doc: any, selectors: string): string | null {
  const selectorList = selectors.split(',').map(s => s.trim());
  for (const selector of selectorList) {
    try {
      const element = doc.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || null;
      }
    } catch (e) {
      console.log(`Selector ${selector} failed, trying next...`);
    }
  }
  return null;
}

function tryMultipleSelectorsForAttr(doc: any, selectors: string, attr: string): string | null {
  const selectorList = selectors.split(',').map(s => s.trim());
  for (const selector of selectorList) {
    try {
      const element = doc.querySelector(selector);
      if (element) {
        return element.getAttribute(attr) || null;
      }
    } catch (e) {
      console.log(`Selector ${selector} failed, trying next...`);
    }
  }
  return null;
}

async function scrapeMangaInfo(url: string, source = "lekmanga") {
  console.log(`Scraping manga info from ${source}:`, url);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) {
    throw new Error(`Unknown source: ${source}`);
  }

  const html = await fetchWithRetry(url, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  if (!doc) {
    throw new Error('Failed to parse HTML');
  }

  // Extract data using flexible selectors
  const title = tryMultipleSelectors(doc, config.selectors.title) || '';
  const cover = tryMultipleSelectorsForAttr(doc, config.selectors.cover, 'src') || 
                tryMultipleSelectorsForAttr(doc, config.selectors.cover, 'data-src') || '';
  const description = tryMultipleSelectors(doc, config.selectors.description) || '';
  const status = tryMultipleSelectors(doc, config.selectors.status) || 'ongoing';
  const author = tryMultipleSelectors(doc, config.selectors.author) || '';
  const artist = tryMultipleSelectors(doc, config.selectors.artist) || '';

  // Extract genres
  const genres: string[] = [];
  try {
    const genreElements = doc.querySelectorAll(config.selectors.genres);
    genreElements.forEach((el: any) => {
      const genre = el.textContent?.trim();
      if (genre) genres.push(genre);
    });
  } catch (e) {
    console.log('Failed to extract genres:', e);
  }

  const slug = extractSlug(url);

  const mangaData = {
    title,
    slug,
    description,
    cover_url: cover,
    status: status.toLowerCase().includes('ongoing') || status.toLowerCase().includes('مستمر') ? 'ongoing' : 'completed',
    genres: genres.length > 0 ? genres : null,
    author: author || null,
    artist: artist || null,
    source_url: url,
    source,
  };

  console.log("Extracted manga data:", mangaData);
  return mangaData;
}

async function scrapeChapters(mangaUrl: string, source = "lekmanga") {
  console.log(`Scraping chapters from ${source}:`, mangaUrl);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) {
    throw new Error(`Unknown source: ${source}`);
  }

  const html = await fetchWithRetry(mangaUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  if (!doc) {
    throw new Error('Failed to parse HTML');
  }

  const chapters: any[] = [];
  
  try {
    const chapterElements = doc.querySelectorAll(config.selectors.chapters);
    console.log(`Found ${chapterElements.length} chapter elements`);

    chapterElements.forEach((chapterEl: any, index: number) => {
      try {
        const linkEl = chapterEl.querySelector(config.selectors.chapterUrl);
        const titleEl = chapterEl.querySelector(config.selectors.chapterTitle);
        const dateEl = chapterEl.querySelector(config.selectors.chapterDate);

        const chapterUrl = linkEl?.getAttribute('href') || '';
        let title = titleEl?.textContent?.trim() || '';
        const dateText = dateEl?.textContent?.trim() || '';

        // Extract chapter number from title or URL
        let chapterNumber = 0;
        const chapterMatch = title.match(/(\d+\.?\d*)/);
        if (chapterMatch) {
          chapterNumber = parseFloat(chapterMatch[1]);
        } else {
          // Try to extract from URL
          const urlMatch = chapterUrl.match(/chapter[_-](\d+\.?\d*)/i);
          if (urlMatch) {
            chapterNumber = parseFloat(urlMatch[1]);
          } else {
            // Use reverse index as fallback
            chapterNumber = chapterElements.length - index;
          }
        }

        if (chapterUrl) {
          chapters.push({
            chapter_number: chapterNumber,
            title: title || `Chapter ${chapterNumber}`,
            source_url: chapterUrl.startsWith('http') ? chapterUrl : `${config.baseUrl}${chapterUrl}`,
            release_date: dateText || null,
          });
        }
      } catch (e) {
        console.error(`Error processing chapter ${index}:`, e);
      }
    });
  } catch (e) {
    console.error('Error extracting chapters:', e);
    throw e;
  }

  console.log(`Extracted ${chapters.length} chapters`);
  return chapters;
}

async function scrapeChapterPages(chapterUrl: string, source = "lekmanga") {
  console.log(`Scraping pages from ${source} chapter:`, chapterUrl);
  
  const config = SCRAPER_CONFIGS[source];
  if (!config) {
    throw new Error(`Unknown source: ${source}`);
  }

  const html = await fetchWithRetry(chapterUrl, config);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  if (!doc) {
    throw new Error('Failed to parse HTML');
  }

  const pages: any[] = [];
  
  try {
    const imageElements = doc.querySelectorAll(config.selectors.pageImages);
    console.log(`Found ${imageElements.length} image elements`);

    imageElements.forEach((img: any, index: number) => {
      try {
        let imageUrl = img.getAttribute('src') || 
                      img.getAttribute('data-src') || 
                      img.getAttribute('data-lazy-src') || '';
        
        if (imageUrl && !imageUrl.includes('loading') && !imageUrl.includes('placeholder')) {
          // Clean up image URL
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (!imageUrl.startsWith('http')) {
            imageUrl = config.baseUrl + imageUrl;
          }
          
          pages.push({
            page_number: index + 1,
            image_url: imageUrl
          });
        }
      } catch (e) {
        console.error(`Error processing image ${index}:`, e);
      }
    });
  } catch (e) {
    console.error('Error extracting pages:', e);
    throw e;
  }

  console.log(`Extracted ${pages.length} pages`);
  return pages;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url, jobType, chapterId, source = "lekmanga" } = await req.json() as ScrapeMangaRequest;
    
    // Validate source
    if (!SCRAPER_CONFIGS[source]) {
      throw new Error(`Unsupported source: ${source}. Available sources: ${Object.keys(SCRAPER_CONFIGS).join(', ')}`);
    }

    console.log(`Starting ${jobType} job for ${source}: ${url || chapterId}`);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        source_url: url || 'pages_job',
        status: 'processing',
        job_type: jobType,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    const jobId = job.id;
    let result: any;

    try {
      if (jobType === "manga_info") {
        const mangaData = await scrapeMangaInfo(url, source);
        
        const { data: manga, error: mangaError } = await supabase
          .from('manga')
          .upsert({
            ...mangaData,
            last_scraped_at: new Date().toISOString(),
          }, {
            onConflict: 'slug',
          })
          .select()
          .single();

        if (mangaError) throw mangaError;
        result = manga;

        await supabase
          .from('scrape_jobs')
          .update({ manga_id: manga.id, status: 'completed' })
          .eq('id', jobId);

      } else if (jobType === "chapters") {
        const chapters = await scrapeChapters(url, source);
        const slug = extractSlug(url);
        
        const { data: manga } = await supabase
          .from('manga')
          .select('id')
          .eq('slug', slug)
          .single();

        if (!manga) throw new Error('Manga not found. Please scrape manga info first.');

        const chaptersData = chapters.map(ch => ({
          ...ch,
          manga_id: manga.id,
        }));

        const { data: insertedChapters, error: chaptersError } = await supabase
          .from('chapters')
          .upsert(chaptersData, {
            onConflict: 'manga_id,chapter_number',
          })
          .select();

        if (chaptersError) throw chaptersError;
        result = insertedChapters;

        await supabase
          .from('scrape_jobs')
          .update({ manga_id: manga.id, status: 'completed' })
          .eq('id', jobId);

      } else if (jobType === "pages" && chapterId) {
        const { data: chapter } = await supabase
          .from('chapters')
          .select('source_url')
          .eq('id', chapterId)
          .single();

        if (!chapter) throw new Error('Chapter not found');

        const pages = await scrapeChapterPages(chapter.source_url, source);
        
        const pagesData = pages.map(p => ({
          ...p,
          chapter_id: chapterId,
        }));

        const { data: insertedPages, error: pagesError } = await supabase
          .from('chapter_pages')
          .upsert(pagesData, {
            onConflict: 'chapter_id,page_number',
          })
          .select();

        if (pagesError) throw pagesError;
        result = insertedPages;

        await supabase
          .from('scrape_jobs')
          .update({ status: 'completed' })
          .eq('id', jobId);
      }

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (scrapeError: any) {
      console.error('Scrape error:', scrapeError);
      
      const { data: failedJob } = await supabase
        .from('scrape_jobs')
        .select('retry_count, max_retries')
        .eq('id', jobId)
        .single();

      const retryCount = (failedJob?.retry_count || 0) + 1;
      const maxRetries = failedJob?.max_retries || 3;

      await supabase
        .from('scrape_jobs')
        .update({
          status: retryCount >= maxRetries ? 'failed' : 'pending',
          error_message: scrapeError?.message || 'Unknown error',
          retry_count: retryCount,
        })
        .eq('id', jobId);

      throw scrapeError;
    }

  } catch (error: any) {
    console.error('Error in scrape function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
