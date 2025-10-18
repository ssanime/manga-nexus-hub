import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeMangaRequest {
  url: string;
  jobType: 'manga_info' | 'chapters' | 'pages';
  chapterId?: string;
}

// Extract manga slug from URL
function extractSlug(url: string): string {
  const match = url.match(/\/manga\/([^\/]+)/);
  return match ? match[1] : '';
}

// Parse manga info from HTML
async function scrapeMangaInfo(url: string) {
  console.log('Scraping manga info from:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract data using regex patterns for Madara theme
    const titleMatch = html.match(/<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const coverMatch = html.match(/<div[^>]*class="[^"]*summary_image[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i);
    const descMatch = html.match(/<div[^>]*class="[^"]*summary__content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const statusMatch = html.match(/<div[^>]*class="[^"]*summary-content[^"]*"[^>]*>[\s\S]*?(ongoing|completed|مستمرة|مكتملة)/i);
    const ratingMatch = html.match(/<span[^>]*class="[^"]*score[^"]*"[^>]*>([0-9.]+)<\/span>/i);
    
    // Extract genres
    const genresMatches = html.matchAll(/<a[^>]*rel="tag"[^>]*>([^<]+)<\/a>/gi);
    const genres: string[] = [];
    for (const match of genresMatches) {
      genres.push(match[1].trim());
    }
    
    // Extract author/artist
    const authorMatch = html.match(/<div[^>]*class="[^"]*author-content[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    const slug = extractSlug(url);
    
    return {
      title,
      slug,
      cover_url: coverMatch ? coverMatch[1] : null,
      description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : null,
      status: statusMatch ? (statusMatch[1].includes('مكتمل') || statusMatch[1] === 'completed' ? 'completed' : 'ongoing') : 'ongoing',
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
      genres,
      author: authorMatch ? authorMatch[1].trim() : null,
      artist: authorMatch ? authorMatch[1].trim() : null,
      source_url: url,
    };
  } catch (error) {
    console.error('Error scraping manga info:', error);
    throw error;
  }
}

// Parse chapters list from HTML
async function scrapeChapters(mangaUrl: string) {
  console.log('Scraping chapters from:', mangaUrl);
  
  try {
    const response = await fetch(mangaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract chapter links (Madara theme structure)
    const chapterMatches = html.matchAll(/<li[^>]*class="[^"]*wp-manga-chapter[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*class="[^"]*chapter-release-date[^"]*"[^>]*>([^<]*)<\/span>/gi);
    
    const chapters = [];
    for (const match of chapterMatches) {
      const chapterUrl = match[1];
      const chapterText = match[2].replace(/<[^>]*>/g, '').trim();
      const releaseDate = match[3].trim();
      
      // Extract chapter number
      const numberMatch = chapterText.match(/(\d+(?:\.\d+)?)/);
      const chapterNumber = numberMatch ? parseFloat(numberMatch[1]) : 0;
      
      chapters.push({
        chapter_number: chapterNumber,
        title: chapterText,
        source_url: chapterUrl,
        release_date: releaseDate,
      });
    }
    
    return chapters.reverse(); // Return in ascending order
  } catch (error) {
    console.error('Error scraping chapters:', error);
    throw error;
  }
}

// Parse chapter pages from HTML
async function scrapeChapterPages(chapterUrl: string) {
  console.log('Scraping chapter pages from:', chapterUrl);
  
  try {
    const response = await fetch(chapterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract image URLs (Madara theme)
    const imageMatches = html.matchAll(/<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="([^"]+)"/gi);
    
    const pages = [];
    let pageNumber = 1;
    
    for (const match of imageMatches) {
      pages.push({
        page_number: pageNumber++,
        image_url: match[1].trim(),
      });
    }
    
    return pages;
  } catch (error) {
    console.error('Error scraping chapter pages:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { url, jobType, chapterId } = await req.json() as ScrapeMangaRequest;

    if (!url) {
      throw new Error('URL is required');
    }

    console.log(`Starting scrape job: ${jobType} for ${url}`);

    let result: any;
    let jobId: string | null = null;

    // Create scrape job
    const { data: job, error: jobError } = await supabaseClient
      .from('scrape_jobs')
      .insert({
        source_url: url,
        status: 'processing',
        job_type: jobType,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw jobError;
    }

    jobId = job.id;

    try {
      if (jobType === 'manga_info') {
        // Scrape manga info
        const mangaData = await scrapeMangaInfo(url);
        
        // Insert or update manga
        const { data: manga, error: mangaError } = await supabaseClient
          .from('manga')
          .upsert({
            ...mangaData,
            last_scraped_at: new Date().toISOString(),
          }, {
            onConflict: 'slug',
          })
          .select()
          .single();

        if (mangaError) throw mangaError;

        result = manga;

        // Update job with manga_id
        await supabaseClient
          .from('scrape_jobs')
          .update({ manga_id: manga.id, status: 'completed' })
          .eq('id', jobId);

      } else if (jobType === 'chapters') {
        // Scrape chapters
        const chapters = await scrapeChapters(url);
        
        // Get manga by URL
        const slug = extractSlug(url);
        const { data: manga } = await supabaseClient
          .from('manga')
          .select('id')
          .eq('slug', slug)
          .single();

        if (!manga) throw new Error('Manga not found');

        // Insert chapters
        const chaptersData = chapters.map(ch => ({
          ...ch,
          manga_id: manga.id,
        }));

        const { data: insertedChapters, error: chaptersError } = await supabaseClient
          .from('chapters')
          .upsert(chaptersData, {
            onConflict: 'manga_id,chapter_number',
          })
          .select();

        if (chaptersError) throw chaptersError;

        result = insertedChapters;

        // Update job
        await supabaseClient
          .from('scrape_jobs')
          .update({ manga_id: manga.id, status: 'completed' })
          .eq('id', jobId);

      } else if (jobType === 'pages' && chapterId) {
        // Get chapter info
        const { data: chapter } = await supabaseClient
          .from('chapters')
          .select('source_url')
          .eq('id', chapterId)
          .single();

        if (!chapter) throw new Error('Chapter not found');

        // Scrape pages
        const pages = await scrapeChapterPages(chapter.source_url);
        
        // Insert pages
        const pagesData = pages.map(p => ({
          ...p,
          chapter_id: chapterId,
        }));

        const { data: insertedPages, error: pagesError } = await supabaseClient
          .from('chapter_pages')
          .upsert(pagesData, {
            onConflict: 'chapter_id,page_number',
          })
          .select();

        if (pagesError) throw pagesError;

        result = insertedPages;

        // Update job
        await supabaseClient
          .from('scrape_jobs')
          .update({ status: 'completed' })
          .eq('id', jobId);
      }

      console.log(`Scrape job completed: ${jobType}`);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (scrapeError: any) {
      console.error('Scrape error:', scrapeError);
      
      // Update job status to failed
      if (jobId) {
        const { data: failedJob } = await supabaseClient
          .from('scrape_jobs')
          .select('retry_count, max_retries')
          .eq('id', jobId)
          .single();

        const retryCount = (failedJob?.retry_count || 0) + 1;
        const maxRetries = failedJob?.max_retries || 3;

        await supabaseClient
          .from('scrape_jobs')
          .update({
            status: retryCount >= maxRetries ? 'failed' : 'pending',
            error_message: scrapeError?.message || 'Unknown error',
            retry_count: retryCount,
          })
          .eq('id', jobId);
      }

      throw scrapeError;
    }

  } catch (error: any) {
    console.error('Error in scrape-lekmanga function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
