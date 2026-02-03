import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Queue All Chapters for Background Download
 * 
 * Adds all chapters without pages for a manga to the download queue.
 * The queue processor will handle them even if user leaves the site.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { mangaId, source, priority = 10 } = await req.json();

    if (!mangaId) {
      throw new Error('mangaId is required');
    }

    console.log(`[QueueAll] Queueing chapters for manga ${mangaId}...`);

    // Get manga info for source if not provided
    let mangaSource = source;
    if (!mangaSource) {
      const { data: manga } = await supabase
        .from('manga')
        .select('source')
        .eq('id', mangaId)
        .single();
      mangaSource = manga?.source || 'onma';
    }

    // Get all chapters for this manga
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select(`
        id,
        chapter_number,
        source_url,
        chapter_pages(count)
      `)
      .eq('manga_id', mangaId)
      .order('chapter_number', { ascending: true });

    if (chaptersError) throw chaptersError;

    if (!chapters || chapters.length === 0) {
      return new Response(
        JSON.stringify({ queued: 0, message: 'No chapters found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter chapters without pages
    const chaptersWithoutPages = chapters.filter((ch: any) => {
      const count = ch.chapter_pages?.[0]?.count || 0;
      return count === 0;
    });

    if (chaptersWithoutPages.length === 0) {
      return new Response(
        JSON.stringify({ queued: 0, message: 'All chapters already have pages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[QueueAll] Found ${chaptersWithoutPages.length} chapters without pages`);

    // Check for existing queue items to avoid duplicates
    const { data: existingQueue } = await supabase
      .from('background_download_queue')
      .select('chapter_id')
      .eq('manga_id', mangaId)
      .in('status', ['pending', 'processing']);

    const existingChapterIds = new Set((existingQueue || []).map(q => q.chapter_id));

    // Prepare queue items (excluding already queued)
    const queueItems = chaptersWithoutPages
      .filter(ch => !existingChapterIds.has(ch.id))
      .map((ch, idx) => ({
        manga_id: mangaId,
        chapter_id: ch.id,
        source: mangaSource,
        source_url: ch.source_url,
        priority: priority - idx, // Earlier chapters have higher priority
        status: 'pending',
      }));

    if (queueItems.length === 0) {
      return new Response(
        JSON.stringify({ queued: 0, message: 'All chapters already queued' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert queue items in batches
    const BATCH_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < queueItems.length; i += BATCH_SIZE) {
      const batch = queueItems.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('background_download_queue')
        .insert(batch);

      if (insertError) {
        console.error('[QueueAll] Insert error:', insertError);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`[QueueAll] ✓ Queued ${inserted} chapters`);

    // Trigger immediate processing (fire-and-forget)
    supabase.functions.invoke('process-download-queue', {
      body: { mangaId }
    }).catch(console.error);

    return new Response(
      JSON.stringify({ 
        queued: inserted,
        total: chaptersWithoutPages.length,
        message: `تم إضافة ${inserted} فصل لقائمة التحميل. سيتم التحميل تلقائياً.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[QueueAll] Error:', error?.message);
    return new Response(
      JSON.stringify({ error: error?.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
