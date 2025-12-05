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

    // Strategy 1: Firecrawl with correct settings
    if (firecrawlApiKey) {
      console.log(`[Bypass] Using Firecrawl API`);
      
      try {
        // Note: timeout is in seconds for Firecrawl, waitFor in milliseconds
        // waitFor must be less than half of timeout (in ms)
        const timeoutSeconds = 60;
        const waitForMs = 5000; // 5 seconds wait for page load
        
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
            timeout: timeoutSeconds,
            onlyMainContent: false,
          }),
        });

        const responseData = await firecrawlResponse.json();
        
        console.log(`[Bypass] Firecrawl Status: ${firecrawlResponse.status}`);
        
        if (firecrawlResponse.ok && responseData.success && responseData.data?.html) {
          const htmlLength = responseData.data.html.length;
          console.log(`[Bypass] ✓ Firecrawl returned ${htmlLength} bytes`);
          
          // Check if we got real content
          if (htmlLength > 10000) {
            const hasRealContent = 
              responseData.data.html.includes('manga') ||
              responseData.data.html.includes('chapter') ||
              responseData.data.html.includes('series') ||
              responseData.data.html.includes('post-title') ||
              responseData.data.html.includes('wp-manga');
              
            if (hasRealContent) {
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
            }
          }
          
          console.log(`[Bypass] ⚠️ Page might be incomplete or not manga content`);
        } else {
          const errorMsg = responseData.error || responseData.message || 'Unknown error';
          console.error(`[Bypass] Firecrawl error: ${errorMsg}`);
        }
      } catch (e) {
        console.error('[Bypass] Firecrawl exception:', e);
      }
    }

    // Strategy 2: Multiple direct fetch attempts with delays
    console.log(`[Bypass] Trying direct fetch with stealth headers`);
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ];
    
    let bestHtml = '';
    let bestLength = 0;
    
    for (let attempt = 1; attempt <= 4; attempt++) {
      const userAgent = userAgents[(attempt - 1) % userAgents.length];
      
      console.log(`[Bypass] Attempt ${attempt}/4 with UA: ${userAgent.substring(0, 50)}...`);
      
      // Add delay between attempts
      if (attempt > 1) {
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
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
            'DNT': '1',
            'Pragma': 'no-cache',
          },
          redirect: 'follow',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const html = await response.text();
        const htmlLength = html.length;
        
        console.log(`[Bypass] Got ${htmlLength} bytes, status ${response.status}`);
        
        // Keep track of best response
        if (htmlLength > bestLength) {
          bestHtml = html;
          bestLength = htmlLength;
        }
        
        // Check for Cloudflare challenge
        const lowerHtml = html.toLowerCase();
        const isChallenge = 
          lowerHtml.includes('checking your browser') ||
          lowerHtml.includes('just a moment') ||
          lowerHtml.includes('cf-browser-verification') ||
          lowerHtml.includes('challenge-platform') ||
          lowerHtml.includes('cf_chl_opt') ||
          (response.status === 403 && lowerHtml.includes('cloudflare'));
        
        if (isChallenge) {
          console.log(`[Bypass] Cloudflare challenge detected, retrying...`);
          continue;
        }
        
        // Check for valid content
        const hasMangaContent = 
          html.includes('wp-manga') ||
          html.includes('manga-chapter') ||
          html.includes('post-title') ||
          html.includes('summary_image') ||
          html.includes('chapter-card') ||
          html.includes('series-thumb') ||
          html.includes('entry-title') ||
          htmlLength > 20000;
        
        if (hasMangaContent && response.status === 200) {
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
        
        console.log(`[Bypass] No valid manga content found in response`);
      } catch (e: any) {
        console.error(`[Bypass] Fetch error:`, e?.message || e);
      }
    }

    // Return best response if we have one
    if (bestLength > 5000) {
      console.log(`[Bypass] Returning best response: ${bestLength} bytes`);
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
