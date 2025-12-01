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

    console.log(`[Cloudflare Bypass] Starting bypass for: ${url}`);

    // Enhanced browser-like headers
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'DNT': '1',
      'Referer': new URL(url).origin,
    };

    // First attempt: Direct fetch with browser-like headers
    console.log(`[Bypass] Attempt 1: Direct fetch with enhanced headers`);
    let response = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    let html = await response.text();

    // Check if Cloudflare challenge detected
    const isCloudflareChallenge = html.includes('Checking your browser') || 
                                   html.includes('Just a moment') ||
                                   html.includes('cf-browser-verification') ||
                                   html.includes('challenge-platform') ||
                                   response.status === 403;

    if (isCloudflareChallenge) {
      console.log(`[Bypass] Cloudflare detected. Attempting retry with delay...`);
      
      // Wait a bit to simulate human behavior
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second attempt: Retry with cookies
      const cookies = response.headers.get('set-cookie') || '';
      
      response = await fetch(url, {
        headers: {
          ...headers,
          'Cookie': cookies,
        },
        redirect: 'follow',
      });

      html = await response.text();
      
      // Check again
      const stillBlocked = html.includes('Checking your browser') || 
                          html.includes('Just a moment') ||
                          html.includes('cf-browser-verification');

      if (stillBlocked) {
        console.log(`[Bypass] Still blocked. Cloudflare protection is too strong.`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'الموقع محمي بحماية Cloudflare قوية. لا يمكن التخطي حالياً.',
            requiresBrowser: true,
            html: html.substring(0, 500), // Send first 500 chars for debugging
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[Bypass] Success! Retrieved ${html.length} bytes`);

    return new Response(
      JSON.stringify({
        success: true,
        html,
        status: response.status,
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
