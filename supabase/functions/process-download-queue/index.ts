import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Background Queue Processor - Aggressive batch processing
 * 
 * - Processes ALL pending items in a loop until timeout or done
 * - Called by cron job every 2 minutes or triggered manually
 * - Self-chains via direct fetch if items remain after timeout
 */

const MAX_PROCESS_TIME_MS = 50_000; // 50s to stay under 60s limit

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const isNearTimeout = () => (Date.now() - startTime) > MAX_PROCESS_TIME_MS;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
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

    let totalProcessed = 0;
    let totalFailed = 0;

    // LOOP: keep processing until timeout or no more items
    while (!isNearTimeout()) {
      // Pick next pending item (one at a time for reliability)
      let query = supabase
        .from('background_download_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (mangaIdFilter) {
        query = query.eq('manga_id', mangaIdFilter);
      }

      const { data: items, error: fetchError } = await query;

      if (fetchError) {
        console.error('[Queue] Fetch error:', fetchError);
        break;
      }

      if (!items || items.length === 0) {
        console.log(`[Queue] No more pending items. Total processed: ${totalProcessed}`);
        break;
      }

      const item = items[0];

      // Mark as processing
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
          console.log(`[Queue] Chapter ${item.chapter_id} already has ${count} pages, skipping`);
          await supabase
            .from('background_download_queue')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', item.id);
          totalProcessed++;
          continue;
        }

        // Call scrape function to download pages
        console.log(`[Queue] Downloading chapter ${item.chapter_id} from ${item.source_url}...`);
        
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

        totalProcessed++;

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

        totalFailed++;
      }

      // Small delay between items to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    // Check if more items remain
    const { count: remainingCount } = await supabase
      .from('background_download_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    console.log(`[Queue] Done: ${totalProcessed} processed, ${totalFailed} failed, ${remainingCount || 0} remaining`);

    // Self-chain: if more items remain, trigger another run immediately
    if ((remainingCount || 0) > 0) {
      console.log(`[Queue] Self-chaining for ${remainingCount} remaining items...`);
      
      try {
        // Use direct fetch for reliable self-chaining (not setTimeout)
        const chainBody = mangaIdFilter ? JSON.stringify({ mangaId: mangaIdFilter }) : '{}';
        fetch(`${supabaseUrl}/functions/v1/process-download-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: chainBody,
        }).catch(e => console.error('[Queue] Chain fetch failed:', e));
      } catch (e) {
        console.error('[Queue] Self-chain failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: totalProcessed, 
        failed: totalFailed,
        remaining: remainingCount || 0,
        message: `Processed ${totalProcessed} items`
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
