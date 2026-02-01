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
  aggressive?: boolean;
}

// 2026 Updated User-Agents - Latest browser versions
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/118.0.0.0',
  // Mobile UAs - sometimes bypass protection better
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.80 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
];

// Cookie strings for different manga sites - helps with session persistence
const SITE_COOKIES: Record<string, string> = {
  'lekmanga': '__cf_bm=bypass; cf_clearance=ok',
  'default': 'viewed=1; consent=true',
};

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check if HTML contains Cloudflare challenge - VERY STRICT detection
function isCloudflareChallenge(html: string, status: number): boolean {
  if (!html || html.length === 0) return true;
  
  const lowerHtml = html.toLowerCase();
  
  // CRITICAL indicators
  const criticalIndicators = [
    'just a moment',
    'checking your browser',
    'cf-browser-verification',
    'challenge-platform',
    '__cf_chl_',
    'cf_chl_opt',
    'turnstile',
    'hcaptcha',
    'recaptcha.net',
    'please wait while we',
    'verifying you are human',
    'enable javascript and cookies',
    'attention required',
    'access denied',
    'ray id:',
  ];
  
  for (const indicator of criticalIndicators) {
    if (lowerHtml.includes(indicator)) {
      console.log(`[CF Check] ❌ Found indicator: ${indicator}`);
      return true;
    }
  }
  
  // Check for very short responses with Cloudflare markers
  if (html.length < 8000 && (lowerHtml.includes('cloudflare') || lowerHtml.includes('cf-'))) {
    console.log(`[CF Check] ❌ Short Cloudflare response: ${html.length} bytes`);
    return true;
  }
  
  // Check status codes
  if (status === 403 || status === 503 || status === 429) {
    console.log(`[CF Check] ❌ Blocked status: ${status}`);
    return true;
  }
  
  return false;
}

// Check if HTML contains valid manga content - Enhanced detection
function hasValidMangaContent(html: string): boolean {
  if (!html || html.length < 5000) return false;
  
  const lowerHtml = html.toLowerCase();
  
  // Strong indicators
  const strongIndicators = [
    'wp-manga', 'manga-', 'chapter', 'episode',
    'manhwa', 'manhua', 'webtoon', 'comic',
    'الفصل', 'المانجا', 'مانجا', 'فصول', 'القراءة',
    'post-title', 'entry-title', 'summary_image',
    'chapter-list', 'reading-content', 'genres',
    'author', 'artist', 'status', 'rating',
    '<article', '<main', 'content-area',
  ];
  
  const matchCount = strongIndicators.filter(p => lowerHtml.includes(p)).length;
  
  // Also check for basic HTML structure
  const hasStructure = lowerHtml.includes('<html') && 
                       (lowerHtml.includes('<body') || lowerHtml.includes('</div>'));
  
  return (matchCount >= 2 && hasStructure) || html.length > 30000;
}

// Build ultra-stealth headers
function buildUltraStealthHeaders(userAgent: string, url: string, cookies?: string): Record<string, string> {
  const domain = new URL(url).hostname;
  const origin = new URL(url).origin;
  
  const headers: Record<string, string> = {
    'Host': domain,
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7,ar-EG;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Pragma': 'no-cache',
    'Priority': 'u=0, i',
  };
  
  // Chrome-specific headers
  if (userAgent.includes('Chrome')) {
    headers['sec-ch-ua'] = '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
    headers['sec-ch-ua-platform-version'] = '"15.0.0"';
    headers['sec-ch-ua-full-version-list'] = '"Not A(Brand";v="8.0.0.0", "Chromium";v="132.0.6834.83", "Google Chrome";v="132.0.6834.83"';
    headers['sec-ch-ua-arch'] = '"x86"';
    headers['sec-ch-ua-bitness'] = '"64"';
    headers['sec-ch-ua-model'] = '""';
    headers['sec-ch-prefers-color-scheme'] = 'dark';
    headers['sec-ch-prefers-reduced-motion'] = 'no-preference';
  }
  
  // Firefox-specific
  if (userAgent.includes('Firefox')) {
    headers['TE'] = 'trailers';
  }
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  
  return headers;
}

// Strategy 1: FIRECRAWL - PRIMARY (since it's connected)
async function useFirecrawl(url: string, aggressive: boolean = false): Promise<{ success: boolean; html?: string; error?: string }> {
  // Try all API key variants
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY') || 
                 Deno.env.get('FIRECRAWL_API_KEY_1') || 
                 Deno.env.get('FIRECRAWL');
  
  if (!apiKey) {
    console.log('[Bypass] Firecrawl API key not found');
    return { success: false, error: 'Firecrawl not configured' };
  }
  
  console.log(`[Bypass] 🔥 Using Firecrawl (aggressive=${aggressive})`);
  console.log(`[Bypass] API Key starts with: ${apiKey.substring(0, 8)}...`);
  
  // Multiple attempts with different configurations
  const configs = aggressive ? [
    { waitFor: 8000, attempt: 1 },
    { waitFor: 12000, attempt: 2 },
    { waitFor: 18000, attempt: 3 },
  ] : [
    { waitFor: 5000, attempt: 1 },
    { waitFor: 10000, attempt: 2 },
  ];
  
  for (const config of configs) {
    try {
      console.log(`[Bypass] Firecrawl attempt ${config.attempt}: waitFor=${config.waitFor}ms`);
      
      // Simplified request body - Firecrawl v1 API format
      const requestBody = {
        url,
        formats: ['html'],
        waitFor: config.waitFor,
        onlyMainContent: false,
      };
      
      console.log(`[Bypass] Firecrawl request:`, JSON.stringify(requestBody));
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseText = await response.text();
      console.log(`[Bypass] Firecrawl response status: ${response.status}`);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.log(`[Bypass] Firecrawl non-JSON response: ${responseText.substring(0, 200)}`);
        continue;
      }
      
      if (response.ok && data.success) {
        // Access html from data.data (v1 API structure)
        const html = data.data?.html || data.html;
        
        if (html && html.length > 0) {
          console.log(`[Bypass] Firecrawl returned ${html.length} bytes`);
          
          if (!isCloudflareChallenge(html, 200) && hasValidMangaContent(html)) {
            console.log(`[Bypass] ✓ Firecrawl success with valid content!`);
            return { success: true, html };
          } else {
            console.log(`[Bypass] Firecrawl returned but content validation failed`);
          }
        }
      } else {
        console.log(`[Bypass] Firecrawl error:`, data.error || `HTTP ${response.status}`);
        if (data.details) {
          console.log(`[Bypass] Firecrawl details:`, data.details);
        }
      }
      
      // Delay between attempts
      if (config.attempt < configs.length) {
        await new Promise(r => setTimeout(r, 2500));
      }
    } catch (e: any) {
      console.error(`[Bypass] Firecrawl exception:`, e?.message);
    }
  }
  
  return { success: false, error: 'All Firecrawl attempts failed' };
}

// Strategy 2: FlareSolverr
async function useFlareSolverr(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const flareSolverrUrl = Deno.env.get('FLARESOLVERR_URL');
  
  if (!flareSolverrUrl) {
    return { success: false, error: 'FlareSolverr not configured' };
  }

  console.log(`[Bypass] Using FlareSolverr at: ${flareSolverrUrl}`);
  
  try {
    const response = await fetch(`${flareSolverrUrl}/v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'request.get',
        url: url,
        maxTimeout: 180000, // 3 minutes
        session: 'manga-scraper-v2',
        session_ttl_minutes: 60,
      }),
    });

    const result = await response.json();
    
    if (result.status === 'ok' && result.solution?.response) {
      const html = result.solution.response;
      
      if (!isCloudflareChallenge(html, 200) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ FlareSolverr success: ${html.length} bytes`);
        return { success: true, html };
      }
    }
    
    return { success: false, error: result.message || 'FlareSolverr failed' };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

// Strategy 3: ZenRows (with antibot)
async function useZenRows(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  const apiKey = Deno.env.get('ZENROWS_API_KEY');
  
  if (!apiKey) {
    return { success: false, error: 'ZenRows not configured' };
  }

  console.log(`[Bypass] Using ZenRows with antibot`);
  
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      url: url,
      js_render: 'true',
      antibot: 'true',
      premium_proxy: 'true',
      wait_for: '.chapter-list, .manga-title, .post-title, article',
      wait: '10000',
    });
    
    const response = await fetch(`https://api.zenrows.com/v1/?${params}`);
    
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

// Strategy 4: Ultra-stealth direct fetch with browser simulation
async function useUltraStealthFetch(url: string, maxRetries: number = 5): Promise<{ success: boolean; html?: string; error?: string }> {
  console.log(`[Bypass] Using ultra-stealth fetch (${maxRetries} attempts)`);
  
  let cookies: string[] = [];
  const domain = new URL(url).origin;
  let bestHtml = '';
  let bestLength = 0;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];
    
    // Human-like progressive delays
    const baseDelay = 2000 + (attempt * 1000);
    const jitter = getRandomDelay(500, 2000);
    await new Promise(r => setTimeout(r, baseDelay + jitter));
    
    console.log(`[Bypass] Stealth attempt ${attempt}/${maxRetries}`);
    
    try {
      // Build headers
      const cookieStr = cookies.length > 0 ? cookies.join('; ') : SITE_COOKIES['default'];
      const headers = buildUltraStealthHeaders(userAgent, url, cookieStr);
      
      // Add referer after first attempt (simulates navigation)
      if (attempt > 1) {
        headers['Referer'] = domain;
        headers['Sec-Fetch-Site'] = 'same-origin';
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000);
      
      const response = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Collect cookies for session persistence
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const newCookies = setCookie.split(',').map(c => c.split(';')[0].trim());
        cookies = [...new Set([...cookies, ...newCookies])];
        console.log(`[Bypass] Collected ${cookies.length} cookies`);
      }
      
      const html = await response.text();
      
      if (html.length > bestLength) {
        bestHtml = html;
        bestLength = html.length;
      }
      
      if (!isCloudflareChallenge(html, response.status) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ Ultra-stealth success on attempt ${attempt}: ${html.length} bytes`);
        return { success: true, html };
      }
      
      // Check for cf_clearance cookie (means challenge was passed)
      if (cookies.some(c => c.includes('cf_clearance'))) {
        console.log(`[Bypass] Got cf_clearance cookie, retrying with session...`);
      }
      
    } catch (e: any) {
      console.log(`[Bypass] Stealth attempt ${attempt} failed:`, e?.message);
    }
  }
  
  // Return best effort if reasonable
  if (bestLength > 8000) {
    return { success: true, html: bestHtml };
  }
  
  return { success: false, error: 'All stealth attempts failed' };
}

// Strategy 5: Multi-origin rotation (tries different entry points)
async function useMultiOriginBypass(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  console.log(`[Bypass] Using multi-origin bypass strategy`);
  
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  
  // Try different URL variations
  const variations = [
    url,
    url.replace('https://', 'https://www.'),
    url.replace('www.', ''),
    `${parsedUrl.origin}${parsedUrl.pathname}`,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  
  for (const variantUrl of variations) {
    console.log(`[Bypass] Trying URL variant: ${variantUrl}`);
    
    const userAgent = getRandomUserAgent();
    const headers = buildUltraStealthHeaders(userAgent, variantUrl);
    
    try {
      await new Promise(r => setTimeout(r, getRandomDelay(1500, 3000)));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      
      const response = await fetch(variantUrl, {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const html = await response.text();
      
      if (!isCloudflareChallenge(html, response.status) && hasValidMangaContent(html)) {
        console.log(`[Bypass] ✓ Multi-origin success with: ${variantUrl}`);
        return { success: true, html };
      }
    } catch (e: any) {
      console.log(`[Bypass] Variant failed:`, e?.message);
    }
  }
  
  return { success: false, error: 'All origin variations failed' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, timeout = 60000, retries = 6, aggressive = true }: BypassRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n========================================`);
    console.log(`🛡️ CLOUDFLARE BYPASS - ENHANCED 2026`);
    console.log(`🔗 URL: ${url}`);
    console.log(`⚡ Aggressive mode: ${aggressive}`);
    console.log(`========================================\n`);
    
    const domain = new URL(url).hostname;
    let bestHtml = '';
    let bestLength = 0;

    // ========================================
    // STRATEGY 1: FIRECRAWL (PRIMARY - STRONGEST)
    // ========================================
    console.log(`\n[Strategy 1] 🔥 FIRECRAWL (PRIMARY)`);
    const firecrawlResult = await useFirecrawl(url, aggressive);
    
    if (firecrawlResult.success && firecrawlResult.html) {
      return new Response(
        JSON.stringify({ success: true, html: firecrawlResult.html, status: 200, method: 'firecrawl' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // STRATEGY 2: FLARESOLVERR
    // ========================================
    console.log(`\n[Strategy 2] 🌐 FLARESOLVERR`);
    const flareSolverResult = await useFlareSolverr(url);
    
    if (flareSolverResult.success && flareSolverResult.html) {
      return new Response(
        JSON.stringify({ success: true, html: flareSolverResult.html, status: 200, method: 'flaresolverr' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // STRATEGY 3: ZENROWS
    // ========================================
    console.log(`\n[Strategy 3] 🚀 ZENROWS`);
    const zenRowsResult = await useZenRows(url);
    
    if (zenRowsResult.success && zenRowsResult.html) {
      return new Response(
        JSON.stringify({ success: true, html: zenRowsResult.html, status: 200, method: 'zenrows' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // STRATEGY 4: ULTRA-STEALTH DIRECT FETCH
    // ========================================
    console.log(`\n[Strategy 4] 🕵️ ULTRA-STEALTH FETCH`);
    const stealthResult = await useUltraStealthFetch(url, aggressive ? 6 : 4);
    
    if (stealthResult.success && stealthResult.html) {
      const html = stealthResult.html;
      if (html.length > bestLength) {
        bestHtml = html;
        bestLength = html.length;
      }
      
      if (hasValidMangaContent(html)) {
        return new Response(
          JSON.stringify({ success: true, html, status: 200, method: 'ultra_stealth' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========================================
    // STRATEGY 5: MULTI-ORIGIN BYPASS
    // ========================================
    console.log(`\n[Strategy 5] 🔄 MULTI-ORIGIN BYPASS`);
    const multiOriginResult = await useMultiOriginBypass(url);
    
    if (multiOriginResult.success && multiOriginResult.html) {
      const html = multiOriginResult.html;
      if (html.length > bestLength) {
        bestHtml = html;
        bestLength = html.length;
      }
      
      if (hasValidMangaContent(html)) {
        return new Response(
          JSON.stringify({ success: true, html, status: 200, method: 'multi_origin' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========================================
    // BEST EFFORT RETURN
    // ========================================
    if (bestLength > 5000) {
      console.log(`\n[Bypass] Returning best effort: ${bestLength} bytes`);
      return new Response(
        JSON.stringify({ success: true, html: bestHtml, status: 200, method: 'best_effort' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // FAILURE - ALL STRATEGIES EXHAUSTED
    // ========================================
    console.log(`\n❌ ALL BYPASS STRATEGIES FAILED`);
    console.log(`Domain: ${domain}`);
    console.log(`Best response: ${bestLength} bytes`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `🛡️ الموقع ${domain.toUpperCase()} محمي بـ Cloudflare ولا يمكن تجاوز الحماية من الخادم. جرب مصدر آخر.\n\n🛡️ ${domain.toUpperCase()} is protected by Cloudflare. Cannot bypass from server. Try a different source.`,
        method: 'failed',
        bestLength,
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bypass] Fatal Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'فشل غير متوقع',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
