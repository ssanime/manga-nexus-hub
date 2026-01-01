import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BypassRequest {
  url: string;
  waitForSelector?: string;
  timeout?: number;
  retries?: number;
}

// Multiple User-Agents mimicking real browsers
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check if HTML contains Cloudflare challenge - STRICT detection
function isCloudflareChallenge(html: string, status: number): boolean {
  const lowerHtml = html.toLowerCase();
  
  // CRITICAL: Check for "Just a moment" - this is THE indicator of Cloudflare challenge
  if (lowerHtml.includes('just a moment') || lowerHtml.includes('checking your browser')) {
    console.log('[Bypass] ⚠️ Detected "Just a moment" challenge page');
    return true;
  }
  
  const strongIndicators = [
    'checking your browser',
    'just a moment',
    'cf-browser-verification',
    'challenge-platform',
    'cf_chl_opt',
    '__cf_chl_jschl_tk__',
    'cf-challenge-running',
    'enable javascript and cookies to continue',
    'please wait while we check your browser',
    'verifying you are human',
    'ddos protection by',
    'attention required',
    'one more step',
  ];
  
  const indicatorCount = strongIndicators.filter(p => lowerHtml.includes(p)).length;
  
  // Also check for very short responses which indicate blocked content
  if (html.length < 5000 && (lowerHtml.includes('cloudflare') || lowerHtml.includes('cf-'))) {
    console.log('[Bypass] ⚠️ Short Cloudflare response detected');
    return true;
  }
  
  return (
    indicatorCount >= 1 ||
    (status === 403 && lowerHtml.includes('cloudflare')) ||
    (status === 503 && lowerHtml.includes('ray id'))
  );
}

// Check if HTML contains valid manga content - Enhanced detection
function hasValidMangaContent(html: string): boolean {
  const lowerHtml = html.toLowerCase();
  
  // Strong indicators for manga sites
  const mangaIndicators = [
    'wp-manga', 'manga-chapter', 'post-title', 'summary_image',
    'chapter-card', 'series-thumb', 'entry-title', 'manga-title',
    'chapter-list', 'reading-content', 'manga-name', 'chapters',
    'الفصل', 'المانجا', 'مانجا', 'فصول',
    // Additional indicators
    'manga', 'manhwa', 'manhua', 'webtoon', 'comic',
    'chapter', 'episode', 'page-break', 'reader',
    'genres', 'author', 'artist', 'status',
    '<h1', '<h2', '<article', '<main',
    'og:title', 'og:image', 'og:description',
  ];
  
  const matchCount = mangaIndicators.filter(p => lowerHtml.includes(p)).length;
  
  return matchCount >= 2 || html.length > 25000;
}

// Build stealth headers that mimic real browsers
function buildStealthHeaders(userAgent: string, referer?: string, cookieStr?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8,ar-SA;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Pragma': 'no-cache',
  };
  
  if (userAgent.includes('Chrome')) {
    headers['sec-ch-ua'] = '"Chromium";v="131", "Not_A Brand";v="24"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
  }
  
  if (referer) {
    headers['Referer'] = referer;
  }
  
  if (cookieStr) {
    headers['Cookie'] = cookieStr;
  }
  
  return headers;
}

// FlareSolverr API integration - ENHANCED with better validation
async function useFlareSolverr(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const flareSolverrUrl = Deno.env.get('FLARESOLVERR_URL');
  
  if (!flareSolverrUrl) {
    console.log('[Bypass] FlareSolverr URL not configured');
    return { success: false, error: 'FlareSolverr not configured' };
  }

  console.log(`[Bypass] Using FlareSolverr at: ${flareSolverrUrl}`);
  
  try {
    const response = await fetch(`${flareSolverrUrl}/v1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cmd: 'request.get',
        url: url,
        maxTimeout: 120000, // Increased to 2 minutes for heavy Cloudflare
        session: 'manga-scraper',
        session_ttl_minutes: 30,
      }),
    });

    const result = await response.json();
    
    if (result.status === 'ok' && result.solution?.response) {
      const html = result.solution.response;
      
      // CRITICAL: Validate that we got real content, not Cloudflare page
      if (isCloudflareChallenge(html, 200)) {
        console.log(`[Bypass] ❌ FlareSolverr returned Cloudflare page, not real content`);
        return {
          success: false,
          error: 'FlareSolverr returned Cloudflare challenge page',
        };
      }
      
      console.log(`[Bypass] ✓ FlareSolverr success: ${html.length} bytes`);
      return {
        success: true,
        html: html,
      };
    } else {
      console.log(`[Bypass] FlareSolverr failed: ${result.message || 'Unknown error'}`);
      return {
        success: false,
        error: result.message || 'FlareSolverr failed',
      };
    }
  } catch (e: any) {
    console.error('[Bypass] FlareSolverr exception:', e?.message);
    return {
      success: false,
      error: e?.message || 'FlareSolverr exception',
    };
  }
}

// CloudProxy API integration (same API format as FlareSolverr)
async function useCloudProxy(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const cloudProxyUrl = Deno.env.get('CLOUDPROXY_URL');
  
  if (!cloudProxyUrl) {
    console.log('[Bypass] CloudProxy URL not configured');
    return { success: false, error: 'CloudProxy not configured' };
  }

  console.log(`[Bypass] Using CloudProxy at: ${cloudProxyUrl}`);
  
  try {
    const response = await fetch(`${cloudProxyUrl}/v1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cmd: 'request.get',
        url: url,
        maxTimeout: 120000,
        userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        session: 'manga-scraper',
      }),
    });

    const result = await response.json();
    
    if (result.status === 'ok' && result.solution?.response) {
      const html = result.solution.response;
      
      // CRITICAL: Validate content
      if (isCloudflareChallenge(html, 200)) {
        console.log(`[Bypass] ❌ CloudProxy returned Cloudflare page`);
        return {
          success: false,
          error: 'CloudProxy returned Cloudflare challenge page',
        };
      }
      
      console.log(`[Bypass] ✓ CloudProxy success: ${html.length} bytes`);
      return {
        success: true,
        html: html,
      };
    } else {
      console.log(`[Bypass] CloudProxy failed: ${result.message || 'Unknown error'}`);
      return {
        success: false,
        error: result.message || 'CloudProxy failed',
      };
    }
  } catch (e: any) {
    console.error('[Bypass] CloudProxy exception:', e?.message);
    return {
      success: false,
      error: e?.message || 'CloudProxy exception',
    };
  }
}

// NEW: ScrapingBee/ScraperAPI style bypass (for future use)
async function useScrapingService(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const apiKey = Deno.env.get('SCRAPING_API_KEY');
  const apiUrl = Deno.env.get('SCRAPING_API_URL');
  
  if (!apiKey || !apiUrl) {
    return { success: false, error: 'Scraping API not configured' };
  }
  
  console.log(`[Bypass] Using Scraping API`);
  
  try {
    const response = await fetch(`${apiUrl}?api_key=${apiKey}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
    });
    
    if (response.ok) {
      const html = await response.text();
      if (isCloudflareChallenge(html, 200)) {
        return { success: false, error: 'Scraping API returned Cloudflare page' };
      }
      console.log(`[Bypass] ✓ Scraping API success: ${html.length} bytes`);
      return { success: true, html };
    }
    return { success: false, error: `HTTP ${response.status}` };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

// FREE: WebScrapingAPI bypass using free tier
async function useWebScrapingAPI(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const apiKey = Deno.env.get('WEBSCRAPING_API_KEY');
  if (!apiKey) {
    console.log('[Bypass] WebScrapingAPI not configured');
    return { success: false, error: 'WebScrapingAPI not configured' };
  }

  console.log(`[Bypass] Using WebScrapingAPI`);
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: '1',
      proxy_type: 'datacenter',
      timeout: '30000',
    });
    
    const response = await fetch(`https://api.webscrapingapi.com/v1?${params}`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
    });
    
    if (response.ok) {
      const html = await response.text();
      if (!isCloudflareChallenge(html, 200) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ WebScrapingAPI success: ${html.length} bytes`);
        return { success: true, html };
      }
    }
    return { success: false, error: `HTTP ${response.status}` };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

// FREE: ZenRows bypass using free tier (1000 free requests)
async function useZenRows(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const apiKey = Deno.env.get('ZENROWS_API_KEY');
  if (!apiKey) {
    console.log('[Bypass] ZenRows not configured');
    return { success: false, error: 'ZenRows not configured' };
  }

  console.log(`[Bypass] Using ZenRows`);
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      url: url,
      js_render: 'true',
      antibot: 'true',
      premium_proxy: 'true',
    });
    
    const response = await fetch(`https://api.zenrows.com/v1/?${params}`, {
      method: 'GET',
    });
    
    if (response.ok) {
      const html = await response.text();
      if (!isCloudflareChallenge(html, 200) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ ZenRows success: ${html.length} bytes`);
        return { success: true, html };
      }
    }
    return { success: false, error: `HTTP ${response.status}` };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

// FREE: ScrapingBee free tier (1000 free credits)
async function useScrapingBee(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const apiKey = Deno.env.get('SCRAPINGBEE_API_KEY');
  if (!apiKey) {
    console.log('[Bypass] ScrapingBee not configured');
    return { success: false, error: 'ScrapingBee not configured' };
  }

  console.log(`[Bypass] Using ScrapingBee`);
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: 'true',
      premium_proxy: 'true',
      block_ads: 'true',
      block_resources: 'false',
    });
    
    const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`, {
      method: 'GET',
    });
    
    if (response.ok) {
      const html = await response.text();
      if (!isCloudflareChallenge(html, 200) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ ScrapingBee success: ${html.length} bytes`);
        return { success: true, html };
      }
    }
    return { success: false, error: `HTTP ${response.status}` };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

// Enhanced direct fetch with browser simulation and TLS fingerprint evasion
async function useEnhancedDirectFetch(url: string, retries: number = 3): Promise<{ success: boolean; html?: string; error?: string }> {
  console.log(`[Bypass] Using enhanced direct fetch with advanced evasion`);
  
  let cookies: string[] = [];
  const domain = new URL(url).origin;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const userAgent = getRandomUserAgent();
    
    // Enhanced headers with more realistic browser fingerprint
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': attempt > 1 ? 'same-origin' : 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'DNT': '1',
      'Pragma': 'no-cache',
      // Chrome-specific headers
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-platform-version': '"15.0.0"',
      'sec-ch-ua-full-version-list': '"Not_A Brand";v="8.0.0.0", "Chromium";v="131.0.6778.86", "Google Chrome";v="131.0.6778.86"',
    };
    
    if (attempt > 1) {
      headers['Referer'] = domain;
    }
    
    if (cookies.length > 0) {
      headers['Cookie'] = cookies.join('; ');
    }
    
    try {
      // Add human-like delay
      await new Promise(r => setTimeout(r, getRandomDelay(2000, 5000)));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Collect cookies
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const newCookies = setCookie.split(',').map(c => c.split(';')[0].trim());
        cookies = [...new Set([...cookies, ...newCookies])];
      }
      
      const html = await response.text();
      
      if (!isCloudflareChallenge(html, response.status) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ Enhanced direct fetch success on attempt ${attempt}: ${html.length} bytes`);
        return { success: true, html };
      }
      
      console.log(`[Bypass] Attempt ${attempt} - CF challenge or invalid content, retrying...`);
    } catch (e: any) {
      console.log(`[Bypass] Enhanced fetch attempt ${attempt} failed:`, e?.message);
    }
    
    // Longer delay between retries
    await new Promise(r => setTimeout(r, getRandomDelay(3000, 7000)));
  }
  
  return { success: false, error: 'All enhanced direct fetch attempts failed' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, timeout = 45000, retries = 5 }: BypassRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cloudflare Bypass] Starting bypass for: ${url}`);
    
    const domain = new URL(url).origin;
    let bestHtml = '';
    let bestLength = 0;
    let lastError = '';

    // Strategy 0: FlareSolverr (best for heavy Cloudflare protection)
    console.log(`[Bypass] Strategy 0: FlareSolverr`);
    const flareSolverResult = await useFlareSolverr(url);
    
    if (flareSolverResult.success && flareSolverResult.html) {
      const html = flareSolverResult.html;
      if (hasValidMangaContent(html) && !isCloudflareChallenge(html, 200)) {
        console.log(`[Bypass] ✓ FlareSolverr success with valid content!`);
        return new Response(
          JSON.stringify({
            success: true,
            html,
            status: 200,
            method: 'flaresolverr',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (html.length > bestLength) {
        bestHtml = html;
        bestLength = html.length;
      }
    }

    // Strategy 0.5: CloudProxy (puppeteer-based)
    console.log(`[Bypass] Strategy 0.5: CloudProxy`);
    const cloudProxyResult = await useCloudProxy(url);
    
    if (cloudProxyResult.success && cloudProxyResult.html) {
      const html = cloudProxyResult.html;
      if (hasValidMangaContent(html) && !isCloudflareChallenge(html, 200)) {
        console.log(`[Bypass] ✓ CloudProxy success with valid content!`);
        return new Response(
          JSON.stringify({
            success: true,
            html,
            status: 200,
            method: 'cloudproxy',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (html.length > bestLength) {
        bestHtml = html;
        bestLength = html.length;
      }
    }

    // Strategy 1: Firecrawl API
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (firecrawlApiKey) {
      console.log(`[Bypass] Strategy 1: Firecrawl API`);
      
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const waitForMs = attempt === 1 ? 5000 : 8000;
          
          console.log(`[Bypass] Firecrawl attempt ${attempt}, waitFor: ${waitForMs}ms`);
          
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              formats: ['html'],
              waitFor: waitForMs,
              timeout: 60,
              onlyMainContent: false,
            }),
          });

          const responseData = await firecrawlResponse.json();
          
          if (firecrawlResponse.ok && responseData.success && responseData.data?.html) {
            const html = responseData.data.html;
            const htmlLength = html.length;
            
            console.log(`[Bypass] Firecrawl returned ${htmlLength} bytes`);
            
            if (htmlLength > bestLength) {
              bestHtml = html;
              bestLength = htmlLength;
            }
            
            if (hasValidMangaContent(html) && !isCloudflareChallenge(html, 200)) {
              console.log(`[Bypass] ✓ Firecrawl success with valid content!`);
              return new Response(
                JSON.stringify({
                  success: true,
                  html,
                  status: 200,
                  method: 'firecrawl',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else {
            lastError = responseData.error || 'Firecrawl failed';
            console.log(`[Bypass] Firecrawl error: ${lastError}`);
          }
          
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 3000));
          }
        } catch (e: any) {
          lastError = e?.message || 'Firecrawl exception';
          console.error('[Bypass] Firecrawl exception:', lastError);
        }
      }
    }

    // Strategy 1.5: FREE APIs - ZenRows, ScrapingBee, WebScrapingAPI
    console.log(`[Bypass] Strategy 1.5: Free scraping APIs`);
    
    // Try ZenRows (1000 free credits)
    const zenRowsResult = await useZenRows(url);
    if (zenRowsResult.success && zenRowsResult.html) {
      console.log(`[Bypass] ✓ ZenRows success!`);
      return new Response(
        JSON.stringify({ success: true, html: zenRowsResult.html, status: 200, method: 'zenrows' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try ScrapingBee (1000 free credits)
    const scrapingBeeResult = await useScrapingBee(url);
    if (scrapingBeeResult.success && scrapingBeeResult.html) {
      console.log(`[Bypass] ✓ ScrapingBee success!`);
      return new Response(
        JSON.stringify({ success: true, html: scrapingBeeResult.html, status: 200, method: 'scrapingbee' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try WebScrapingAPI
    const webScrapingResult = await useWebScrapingAPI(url);
    if (webScrapingResult.success && webScrapingResult.html) {
      console.log(`[Bypass] ✓ WebScrapingAPI success!`);
      return new Response(
        JSON.stringify({ success: true, html: webScrapingResult.html, status: 200, method: 'webscrapingapi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strategy 1.7: Enhanced Direct Fetch with advanced browser simulation
    console.log(`[Bypass] Strategy 1.7: Enhanced direct fetch`);
    const enhancedResult = await useEnhancedDirectFetch(url, 3);
    if (enhancedResult.success && enhancedResult.html) {
      console.log(`[Bypass] ✓ Enhanced direct fetch success!`);
      return new Response(
        JSON.stringify({ success: true, html: enhancedResult.html, status: 200, method: 'enhanced_direct' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strategy 2: Direct fetch with stealth headers
    console.log(`[Bypass] Strategy 2: Direct fetch with stealth headers`);
    
    let cookies: string[] = [];
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      const userAgent = getRandomUserAgent();
      const delay = getRandomDelay(2000, 5000);
      
      console.log(`[Bypass] Attempt ${attempt}/${retries}, delay: ${delay}ms`);
      
      if (attempt > 1) {
        await new Promise(r => setTimeout(r, delay));
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const cookieStr = cookies.length > 0 ? cookies.join('; ') : undefined;
        const headers = buildStealthHeaders(userAgent, attempt > 1 ? domain : undefined, cookieStr);
        
        const response = await fetch(url, {
          headers,
          redirect: 'follow',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          const newCookies = setCookie.split(',').map(c => c.split(';')[0].trim());
          cookies = [...new Set([...cookies, ...newCookies])];
          console.log(`[Bypass] Saved ${cookies.length} cookies`);
        }

        const html = await response.text();
        const htmlLength = html.length;
        const status = response.status;
        
        console.log(`[Bypass] Got ${htmlLength} bytes, status ${status}`);
        
        if (htmlLength > bestLength) {
          bestHtml = html;
          bestLength = htmlLength;
        }
        
        if (isCloudflareChallenge(html, status)) {
          console.log(`[Bypass] Cloudflare challenge detected, continuing...`);
          continue;
        }
        
        if (hasValidMangaContent(html) && status === 200) {
          console.log(`[Bypass] ✓ Valid content detected!`);
          return new Response(
            JSON.stringify({
              success: true,
              html,
              status,
              method: 'direct_fetch',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (htmlLength > 15000 && status === 200 && !isCloudflareChallenge(html, status)) {
          console.log(`[Bypass] ✓ Accepting content based on size`);
          return new Response(
            JSON.stringify({
              success: true,
              html,
              status,
              method: 'direct_fetch_size',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
      } catch (e: any) {
        lastError = e?.message || 'Fetch failed';
        console.error(`[Bypass] Fetch error:`, lastError);
      }
    }

    // Return best response if we have reasonable content
    if (bestLength > 5000) {
      console.log(`[Bypass] Returning best effort: ${bestLength} bytes`);
      return new Response(
        JSON.stringify({
          success: true,
          html: bestHtml,
          status: 200,
          method: 'best_effort',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Bypass] ❌ All bypass methods failed. Best: ${bestLength} bytes`);
    return new Response(
      JSON.stringify({
        success: false,
        error: `فشل تجاوز الحماية. ${lastError}`,
        method: 'failed',
        bestLength,
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bypass] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'فشل غير متوقع',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
