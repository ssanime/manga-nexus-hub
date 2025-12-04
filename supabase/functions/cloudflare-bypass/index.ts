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
    const { url, waitForSelector, timeout = 30000 }: BypassRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cloudflare Bypass] Starting advanced bypass for: ${url}`);

    // Get Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Strategy 1: Try Firecrawl first (best for Cloudflare)
    if (firecrawlApiKey) {
      console.log(`[Bypass] Attempt 1: Using Firecrawl API (advanced browser emulation)`);
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
            waitFor: 5000, // Always wait for page to fully load
            timeout: Math.floor(timeout / 1000) + 10, // Add extra time
            actions: waitForSelector ? [{ type: 'wait', selector: waitForSelector }] : undefined,
          }),
        });

        const responseData = await firecrawlResponse.json();
        
        console.log(`[Bypass] Firecrawl Response Status: ${firecrawlResponse.status}`);
        
        if (firecrawlResponse.ok && responseData.success && responseData.data?.html) {
          const htmlLength = responseData.data.html.length;
          console.log(`[Bypass] ✓ Firecrawl success! Retrieved ${htmlLength} bytes`);
          
          // Validate that we got actual content (manga pages should be > 10KB)
          if (htmlLength > 10000) {
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
            console.log(`[Bypass] ⚠️ Firecrawl returned small page (${htmlLength} bytes), trying enhanced fetch`);
          }
        } else {
          const errorMsg = responseData.error || responseData.message || 'Unknown error';
          console.error(`[Bypass] ❌ Firecrawl failed (${firecrawlResponse.status}): ${errorMsg}`);
        }
      } catch (firecrawlError) {
        console.error('[Bypass] Firecrawl exception:', firecrawlError);
      }
    } else {
      console.log(`[Bypass] ⚠️ No Firecrawl API key, skipping to enhanced fetch`);
    }

    // Strategy 2: Enhanced fetch with multiple attempts
    console.log(`[Bypass] Attempt 2: Enhanced fetch with stealth mode`);
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const baseHeaders: HeadersInit = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
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
    };

    // Try multiple times with different strategies
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[Bypass] Enhanced fetch attempt ${attempt}/3`);
      
      const headers = {
        ...baseHeaders,
        'Referer': attempt === 1 ? '' : new URL(url).origin + '/',
      };
      
      // Add delay between attempts
      if (attempt > 1) {
        const delay = 1000 + Math.floor(Math.random() * 2000);
        console.log(`[Bypass] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        const response = await fetch(url, {
          headers,
          redirect: 'follow',
        });

        const html = await response.text();
        const htmlLength = html.length;
        
        console.log(`[Bypass] Attempt ${attempt}: Got ${htmlLength} bytes, status ${response.status}`);
        
        // Log first part of HTML for debugging
        console.log(`[Bypass] HTML preview: ${html.substring(0, 300).replace(/\n/g, ' ')}`);

        // Check if this is a Cloudflare challenge
        const isCloudflareChallenge = 
          html.includes('Checking your browser') || 
          html.includes('Just a moment') ||
          html.includes('cf-browser-verification') ||
          html.includes('challenge-platform') ||
          html.includes('cf-spinner') ||
          html.includes('__cf_chl_tk') ||
          (response.status === 403 && html.includes('cloudflare')) ||
          (response.status === 503 && html.includes('ray ID'));

        if (isCloudflareChallenge) {
          console.log(`[Bypass] ⚠️ Cloudflare challenge detected on attempt ${attempt}`);
          continue; // Try again
        }

        // Check if we got actual manga content
        const hasMangaContent = 
          html.includes('manga') || 
          html.includes('chapter') || 
          html.includes('wp-manga') ||
          html.includes('summary_image') ||
          html.includes('entry-title') ||
          html.includes('post-title') ||
          htmlLength > 15000; // Good pages are usually > 15KB

        if (hasMangaContent && htmlLength > 5000) {
          console.log(`[Bypass] ✓ Got valid manga content! ${htmlLength} bytes`);
          return new Response(
            JSON.stringify({
              success: true,
              html,
              status: response.status,
              method: 'enhanced_fetch',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Bypass] ⚠️ Page doesn't seem to have manga content, trying again...`);
      } catch (fetchError) {
        console.error(`[Bypass] Fetch error on attempt ${attempt}:`, fetchError);
      }
    }

    // If all attempts fail, return what we have
    console.log(`[Bypass] ❌ All attempts failed, trying one last direct fetch`);
    
    const lastResponse = await fetch(url, {
      headers: baseHeaders,
      redirect: 'follow',
    });
    const lastHtml = await lastResponse.text();
    
    console.log(`[Bypass] Last resort: ${lastHtml.length} bytes`);

    // Return whatever we got
    return new Response(
      JSON.stringify({
        success: lastHtml.length > 5000,
        html: lastHtml,
        status: lastResponse.status,
        method: 'last_resort',
        warning: lastHtml.length < 10000 ? 'الصفحة قد تكون غير مكتملة' : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bypass] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'فشل السحب',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
