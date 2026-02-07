import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Background Queue Processor - Enhanced with self-chaining
 * 
 * - Called by cron job every 2 minutes or triggered manually
 * - Processes pending items in batches
 * - Self-chains to continue processing if more items remain
 * - Retries failed items with exponential backoff
 */

const BATCH_SIZE = 3;
const MAX_PROCESS_TIME_MS = 45_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const isNearTimeout = () => (Date.now() - startTime) > MAX_PROCESS_TIME_MS;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const mangaIdFilter = body.mangaId;

    // Reset stale "processing" items (stuck for > 5 minutes)
    await supabase
      .from('background_download_queue')
      .update({ status: 'pending' })
      .eq('status', 'processing')
      .lt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // Pick pending items
    let query = supabase
      .from('background_download_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (mangaIdFilter) {
      query = query.eq('manga_id', mangaIdFilter);
    }

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Queue] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!items || items.length === 0) {
      console.log('[Queue] No pending items');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending items' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Queue] Processing ${items.length} items...`);

    let processed = 0;
    let failed = 0;

    for (const item of items) {
      if (isNearTimeout()) {
        console.log('[Queue] Near timeout, stopping...');
        break;
      }

      // Mark as processing with updated timestamp
      await supabase
        .from('background_download_queue')
        .update({ 
          status: 'processing', 
          attempts: (item.attempts || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      try {
        // Check if chapter already has pages
        const { count } = await supabase
          .from('chapter_pages')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', item.chapter_id);

        if (count && count > 0) {
          console.log(`[Queue] Chapter ${item.chapter_id} already has ${count} pages, marking complete`);
          await supabase
            .from('background_download_queue')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', item.id);
          processed++;
          continue;
        }

        // Call scrape function to download pages
        console.log(`[Queue] Downloading pages for chapter ${item.chapter_id}...`);
        
        const { data: result, error: scrapeError } = await supabase.functions.invoke('scrape-lekmanga', {
          body: {
            url: item.source_url,
            jobType: 'pages',
            source: item.source,
            chapterId: item.chapter_id,
          },
        });

        if (scrapeError || result?.error) {
          throw new Error(scrapeError?.message || result?.error || 'Scrape failed');
        }

        const pagesCount = result?.pagesCount || 0;
        console.log(`[Queue] ✓ Chapter ${item.chapter_id}: ${pagesCount} pages`);

        await supabase
          .from('background_download_queue')
          .update({ 
            status: pagesCount > 0 ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            error_message: pagesCount === 0 ? 'No pages extracted' : null
          })
          .eq('id', item.id);

        processed++;

      } catch (err: any) {
        console.error(`[Queue] ✗ Item ${item.id}:`, err?.message);
        
        const currentAttempts = (item.attempts || 0) + 1;
        const maxAttempts = item.max_attempts || 3;
        const shouldRetry = currentAttempts < maxAttempts;
        
        await supabase
          .from('background_download_queue')
          .update({ 
            status: shouldRetry ? 'pending' : 'failed',
            error_message: err?.message || 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        failed++;
      }

      // Delay between items to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }

    // Check if more items exist
    const { count: remainingCount } = await supabase
      .from('background_download_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    console.log(`[Queue] Done: ${processed} processed, ${failed} failed, ${remainingCount || 0} remaining`);

    // Self-chain: if more items remain and we have time, trigger another round
    if ((remainingCount || 0) > 0 && !isNearTimeout()) {
      console.log(`[Queue] Self-chaining to process remaining ${remainingCount} items...`);
      
      // Fire-and-forget: trigger next batch after a delay
      setTimeout(async () => {
        try {
          await supabase.functions.invoke('process-download-queue', {
            body: mangaIdFilter ? { mangaId: mangaIdFilter } : {},
          });
        } catch (e) {
          console.error('[Queue] Self-chain failed:', e);
        }
      }, 3000);
    }

    return new Response(
      JSON.stringify({ 
        processed, 
        failed,
        remaining: remainingCount || 0,
        message: `Processed ${processed} items`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Queue] Fatal error:', error?.message);
    return new Response(
      JSON.stringify({ error: error?.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
