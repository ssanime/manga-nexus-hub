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
            waitFor: waitForSelector ? 5000 : 0,
            timeout: Math.floor(timeout / 1000),
            actions: waitForSelector ? [{ type: 'wait', selector: waitForSelector }] : undefined,
          }),
        });

        const responseData = await firecrawlResponse.json();
        
        console.log(`[Bypass] Firecrawl Response Status: ${firecrawlResponse.status}`);
        
        if (firecrawlResponse.ok && responseData.success && responseData.data?.html) {
          console.log(`[Bypass] ✓ Firecrawl success! Retrieved ${responseData.data.html.length} bytes`);
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
          // Log detailed error from Firecrawl
          const errorMsg = responseData.error || responseData.message || 'Unknown error';
          console.error(`[Bypass] ❌ Firecrawl failed (${firecrawlResponse.status}): ${errorMsg}`);
          
          if (firecrawlResponse.status === 401) {
            console.error('[Bypass] ⚠️ Firecrawl API key is invalid or expired. Please update FIRECRAWL_API_KEY secret.');
          } else if (firecrawlResponse.status === 402) {
            console.error('[Bypass] ⚠️ Firecrawl quota exceeded. Please check your plan.');
          } else if (firecrawlResponse.status === 429) {
            console.error('[Bypass] ⚠️ Firecrawl rate limit reached. Please wait before trying again.');
          }
          
          console.log(`[Bypass] ⚠️ Falling back to enhanced fetch`);
        }
      } catch (firecrawlError) {
        console.error('[Bypass] Firecrawl exception:', firecrawlError);
      }
    } else {
      console.log(`[Bypass] ⚠️ No Firecrawl API key, skipping to enhanced fetch`);
    }

    // Strategy 2: Enhanced fetch with stealth techniques
    console.log(`[Bypass] Attempt 2: Enhanced fetch with stealth mode`);
    
    // Randomize user agent for better stealth
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const headers: HeadersInit = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'DNT': '1',
      'Referer': new URL(url).origin,
    };

    let response = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    let html = await response.text();

    // Improved Cloudflare detection - more accurate indicators
    const isCloudflareChallenge = (
      html.includes('Checking your browser') || 
      html.includes('Just a moment') ||
      html.includes('cf-browser-verification') ||
      html.includes('challenge-platform') ||
      html.includes('cf-spinner') ||
      html.includes('__cf_chl_tk') ||
      html.includes('cf_clearance') ||
      (response.status === 403 && (html.includes('cloudflare') || html.includes('Cloudflare'))) ||
      (response.status === 503 && html.includes('ray ID'))
    ) && !html.includes('<!DOCTYPE html>');

    if (isCloudflareChallenge) {
      console.log(`[Bypass] ⚠️ Cloudflare detected. Attempting stealth retry...`);
      
      // Strategy 3: Retry with cookies and timing randomization
      const cookies = response.headers.get('set-cookie') || '';
      
      // Random human-like delay (2-5 seconds)
      const delay = 2000 + Math.floor(Math.random() * 3000);
      console.log(`[Bypass] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      response = await fetch(url, {
        headers: {
          ...headers,
          'Cookie': cookies,
          // Add Origin for more realistic request
          'Origin': new URL(url).origin,
        },
        redirect: 'follow',
      });

      html = await response.text();
      
      // Check again
      const stillBlocked = html.includes('Checking your browser') || 
                          html.includes('Just a moment') ||
                          html.includes('cf-browser-verification') ||
                          html.includes('challenge-platform');

      if (stillBlocked) {
        console.log(`[Bypass] ❌ Still blocked after all attempts`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'الموقع محمي بحماية Cloudflare قوية. يرجى تفعيل Firecrawl API للتجاوز الكامل.',
            requiresBrowser: true,
            method: 'enhanced_fetch_failed',
            html: html.substring(0, 500),
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[Bypass] ✓ Enhanced fetch success! Retrieved ${html.length} bytes`);

    return new Response(
      JSON.stringify({
        success: true,
        html,
        status: response.status,
        method: 'enhanced_fetch',
        headers: Object.fromEntries(response.headers.entries()),
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
