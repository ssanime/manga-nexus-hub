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

// Check if HTML contains Cloudflare challenge
function isCloudflareChallenge(html: string, status: number): boolean {
  const lowerHtml = html.toLowerCase();
  
  const strongIndicators = [
    'checking your browser',
    'just a moment',
    'cf-browser-verification',
    'challenge-platform',
    'cf_chl_opt',
    '__cf_chl_jschl_tk__',
    'cf-challenge-running',
    'enable javascript and cookies to continue',
  ];
  
  const indicatorCount = strongIndicators.filter(p => lowerHtml.includes(p)).length;
  
  return (
    indicatorCount >= 1 ||
    (status === 403 && lowerHtml.includes('cloudflare')) ||
    (status === 503 && lowerHtml.includes('ray id'))
  );
}

// Check if HTML contains valid manga content
function hasValidMangaContent(html: string): boolean {
  const lowerHtml = html.toLowerCase();
  
  const mangaIndicators = [
    'wp-manga', 'manga-chapter', 'post-title', 'summary_image',
    'chapter-card', 'series-thumb', 'entry-title', 'manga-title',
    'chapter-list', 'reading-content', 'manga-name', 'chapters',
    'الفصل', 'المانجا', 'مانجا', 'فصول',
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

// FlareSolverr API integration
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
        maxTimeout: 60000,
      }),
    });

    const result = await response.json();
    
    if (result.status === 'ok' && result.solution?.response) {
      console.log(`[Bypass] FlareSolverr success: ${result.solution.response.length} bytes`);
      return {
        success: true,
        html: result.solution.response,
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
        maxTimeout: 60000,
        userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      }),
    });

    const result = await response.json();
    
    if (result.status === 'ok' && result.solution?.response) {
      console.log(`[Bypass] CloudProxy success: ${result.solution.response.length} bytes`);
      return {
        success: true,
        html: result.solution.response,
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
