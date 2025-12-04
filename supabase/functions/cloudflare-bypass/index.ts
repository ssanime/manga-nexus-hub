import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BypassRequest {
  url: string;
  waitForSelector?: string;
  timeout?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, waitForSelector, timeout = 45000 }: BypassRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cloudflare Bypass] Starting bypass for: ${url}`);

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Strategy 1: Firecrawl with optimized settings
    if (firecrawlApiKey) {
      console.log(`[Bypass] Using Firecrawl API with extended timeout`);
      
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: ['html'],
            waitFor: 8000, // Wait 8 seconds for page to load
            timeout: 60, // 60 seconds timeout
            onlyMainContent: false, // Get full HTML
          }),
        });

        const responseData = await firecrawlResponse.json();
        
        console.log(`[Bypass] Firecrawl Status: ${firecrawlResponse.status}`);
        
        if (firecrawlResponse.ok && responseData.success && responseData.data?.html) {
          const htmlLength = responseData.data.html.length;
          console.log(`[Bypass] ✓ Firecrawl returned ${htmlLength} bytes`);
          
          // Check if we got real content (manga pages should be > 20KB)
          if (htmlLength > 20000) {
            console.log(`[Bypass] ✓ Valid manga page content!`);
            return new Response(
              JSON.stringify({
                success: true,
                html: responseData.data.html,
                status: 200,
                method: 'firecrawl',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.log(`[Bypass] ⚠️ Page too small (${htmlLength} bytes), might be incomplete`);
          }
        } else {
          const errorMsg = responseData.error || responseData.message || 'Unknown error';
          console.error(`[Bypass] Firecrawl error: ${errorMsg}`);
        }
      } catch (e) {
        console.error('[Bypass] Firecrawl exception:', e);
      }
    }

    // Strategy 2: Direct fetch with browser-like headers
    console.log(`[Bypass] Trying direct fetch with stealth headers`);
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    ];
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      const userAgent = userAgents[(attempt - 1) % userAgents.length];
      
      console.log(`[Bypass] Attempt ${attempt}/3 with UA: ${userAgent.substring(0, 50)}...`);
      
      if (attempt > 1) {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      }
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
          },
          redirect: 'follow',
        });

        const html = await response.text();
        const htmlLength = html.length;
        
        console.log(`[Bypass] Got ${htmlLength} bytes, status ${response.status}`);
        
        // Check for Cloudflare challenge
        const isChallenge = 
          html.includes('Checking your browser') ||
          html.includes('Just a moment') ||
          html.includes('cf-browser-verification') ||
          html.includes('challenge-platform') ||
          (response.status === 403 && html.includes('cloudflare'));
        
        if (isChallenge) {
          console.log(`[Bypass] Cloudflare challenge detected, retrying...`);
          continue;
        }
        
        // Check for valid manga content
        const hasMangaContent = 
          html.includes('wp-manga') ||
          html.includes('manga-chapter') ||
          html.includes('post-title') ||
          html.includes('summary_image') ||
          html.includes('chapter') ||
          htmlLength > 15000;
        
        if (hasMangaContent) {
          console.log(`[Bypass] ✓ Valid content detected!`);
          return new Response(
            JSON.stringify({
              success: true,
              html,
              status: response.status,
              method: 'direct_fetch',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`[Bypass] No manga content found in response`);
      } catch (e) {
        console.error(`[Bypass] Fetch error:`, e);
      }
    }

    // If all else fails, return error
    console.log(`[Bypass] ❌ All bypass methods failed`);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'فشل تجاوز الحماية. الموقع قد يكون محمي بشكل قوي.',
        method: 'failed',
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
