import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const yugabyteConnectionString = Deno.env.get('YUGABYTE_CONNECTION_STRING')
    if (!yugabyteConnectionString) {
      console.error('YUGABYTE_CONNECTION_STRING not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Yugabyte connection string not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, limit = 50, offset = 0 } = await req.json()

    console.log(`Yugabyte sync action: ${action}, limit: ${limit}, offset: ${offset}`)

    // Connect to Yugabyte PostgreSQL
    const client = new Client(yugabyteConnectionString)
    await client.connect()
    console.log('Connected to Yugabyte database')

    if (action === 'test') {
      // Test connection and list tables
      const tablesResult = await client.queryObject(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `)
      
      await client.end()
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            tables: tablesResult.rows,
            message: 'Successfully connected to Yugabyte database'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'list_tables') {
      // Get detailed table info
      const tablesResult = await client.queryObject(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
      `)
      
      // Get columns for each table
      const columnsResult = await client.queryObject(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `)
      
      await client.end()
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            tables: tablesResult.rows,
            columns: columnsResult.rows
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync_manga') {
      // Fetch manga from Yugabyte
      const mangaResult = await client.queryObject(`
        SELECT * FROM manga LIMIT ${limit} OFFSET ${offset}
      `)
      
      console.log(`Fetched ${mangaResult.rows.length} manga from Yugabyte`)
      
      // Insert into Supabase
      let inserted = 0
      let updated = 0
      let errors: string[] = []
      
      for (const manga of mangaResult.rows as any[]) {
        try {
          // Check if manga exists by slug or title
          const { data: existing } = await supabase
            .from('manga')
            .select('id')
            .or(`slug.eq.${manga.slug || ''},title.eq.${manga.title}`)
            .maybeSingle()
          
          const mangaData = {
            title: manga.title,
            slug: manga.slug || manga.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            alternative_titles: manga.alternative_titles || [],
            cover_url: manga.cover_url,
            banner_url: manga.banner_url,
            description: manga.description,
            status: manga.status,
            author: manga.author,
            artist: manga.artist,
            genres: manga.genres || [],
            rating: manga.rating || 0,
            views: manga.views || 0,
            favorites: manga.favorites || 0,
            year: manga.year,
            country: manga.country,
            language: manga.language || 'العربية',
            publisher: manga.publisher,
            tags: manga.tags || [],
            source: 'yugabyte',
            source_url: manga.source_url || `yugabyte://${manga.id}`,
          }
          
          if (existing) {
            const { error } = await supabase
              .from('manga')
              .update(mangaData)
              .eq('id', existing.id)
            
            if (error) throw error
            updated++
          } else {
            const { error } = await supabase
              .from('manga')
              .insert(mangaData)
            
            if (error) throw error
            inserted++
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error'
          errors.push(`Manga ${manga.title}: ${errorMsg}`)
          console.error(`Error syncing manga ${manga.title}:`, e)
        }
      }
      
      await client.end()
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            total: mangaResult.rows.length,
            inserted,
            updated,
            errors: errors.length > 0 ? errors : undefined
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync_chapters') {
      const { manga_slug } = await req.json().catch(() => ({}))
      
      // Get manga mapping (Yugabyte ID -> Supabase ID)
      let mangaMapping: Record<string, string> = {}
      
      // First get manga from Yugabyte with their IDs
      const yugabyteManga = await client.queryObject(`SELECT id, slug, title FROM manga`)
      
      // Get corresponding manga from Supabase
      for (const ym of yugabyteManga.rows as any[]) {
        const { data } = await supabase
          .from('manga')
          .select('id')
          .or(`slug.eq.${ym.slug || ''},title.eq.${ym.title}`)
          .maybeSingle()
        
        if (data) {
          mangaMapping[ym.id] = data.id
        }
      }
      
      // Fetch chapters from Yugabyte
      let chaptersQuery = `SELECT * FROM chapters`
      if (manga_slug) {
        const mangaResult = await client.queryObject(`SELECT id FROM manga WHERE slug = $1`, [manga_slug])
        if (mangaResult.rows.length > 0) {
          const mangaId = (mangaResult.rows[0] as any).id
          chaptersQuery += ` WHERE manga_id = '${mangaId}'`
        }
      }
      chaptersQuery += ` ORDER BY chapter_number LIMIT ${limit} OFFSET ${offset}`
      
      const chaptersResult = await client.queryObject(chaptersQuery)
      
      console.log(`Fetched ${chaptersResult.rows.length} chapters from Yugabyte`)
      
      let inserted = 0
      let updated = 0
      let skipped = 0
      let errors: string[] = []
      
      for (const chapter of chaptersResult.rows as any[]) {
        try {
          const supabaseMangaId = mangaMapping[chapter.manga_id]
          if (!supabaseMangaId) {
            skipped++
            continue
          }
          
          // Check if chapter exists
          const { data: existing } = await supabase
            .from('chapters')
            .select('id')
            .eq('manga_id', supabaseMangaId)
            .eq('chapter_number', chapter.chapter_number)
            .maybeSingle()
          
          const chapterData = {
            manga_id: supabaseMangaId,
            chapter_number: chapter.chapter_number,
            title: chapter.title,
            source_url: chapter.source_url || `yugabyte://chapter/${chapter.id}`,
            release_date: chapter.release_date,
            views: chapter.views || 0,
          }
          
          if (existing) {
            const { error } = await supabase
              .from('chapters')
              .update(chapterData)
              .eq('id', existing.id)
            
            if (error) throw error
            updated++
          } else {
            const { error } = await supabase
              .from('chapters')
              .insert(chapterData)
            
            if (error) throw error
            inserted++
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error'
          errors.push(`Chapter ${chapter.chapter_number}: ${errorMsg}`)
          console.error(`Error syncing chapter:`, e)
        }
      }
      
      await client.end()
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            total: chaptersResult.rows.length,
            inserted,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync_pages') {
      const { chapter_id } = await req.json().catch(() => ({}))
      
      // Get chapter mapping
      let chapterMapping: Record<string, string> = {}
      
      // Get chapters from Yugabyte
      const yugabyteChapters = await client.queryObject(`SELECT id, manga_id, chapter_number FROM chapters`)
      
      // Get manga mapping first
      const yugabyteManga = await client.queryObject(`SELECT id, slug, title FROM manga`)
      let mangaMapping: Record<string, string> = {}
      
      for (const ym of yugabyteManga.rows as any[]) {
        const { data } = await supabase
          .from('manga')
          .select('id')
          .or(`slug.eq.${ym.slug || ''},title.eq.${ym.title}`)
          .maybeSingle()
        
        if (data) {
          mangaMapping[ym.id] = data.id
        }
      }
      
      // Now map chapters
      for (const yc of yugabyteChapters.rows as any[]) {
        const supabaseMangaId = mangaMapping[yc.manga_id]
        if (!supabaseMangaId) continue
        
        const { data } = await supabase
          .from('chapters')
          .select('id')
          .eq('manga_id', supabaseMangaId)
          .eq('chapter_number', yc.chapter_number)
          .maybeSingle()
        
        if (data) {
          chapterMapping[yc.id] = data.id
        }
      }
      
      // Fetch pages from Yugabyte
      let pagesQuery = `SELECT * FROM chapter_pages`
      if (chapter_id) {
        pagesQuery += ` WHERE chapter_id = '${chapter_id}'`
      }
      pagesQuery += ` ORDER BY page_number LIMIT ${limit} OFFSET ${offset}`
      
      const pagesResult = await client.queryObject(pagesQuery)
      
      console.log(`Fetched ${pagesResult.rows.length} pages from Yugabyte`)
      
      let inserted = 0
      let skipped = 0
      let errors: string[] = []
      
      for (const page of pagesResult.rows as any[]) {
        try {
          const supabaseChapterId = chapterMapping[page.chapter_id]
          if (!supabaseChapterId) {
            skipped++
            continue
          }
          
          // Check if page exists
          const { data: existing } = await supabase
            .from('chapter_pages')
            .select('id')
            .eq('chapter_id', supabaseChapterId)
            .eq('page_number', page.page_number)
            .maybeSingle()
          
          if (existing) {
            skipped++
            continue
          }
          
          const { error } = await supabase
            .from('chapter_pages')
            .insert({
              chapter_id: supabaseChapterId,
              page_number: page.page_number,
              image_url: page.image_url,
            })
          
          if (error) throw error
          inserted++
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error'
          errors.push(`Page ${page.page_number}: ${errorMsg}`)
          console.error(`Error syncing page:`, e)
        }
      }
      
      await client.end()
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            total: pagesResult.rows.length,
            inserted,
            skipped,
            errors: errors.length > 0 ? errors : undefined
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'full_sync') {
      // Full sync: manga -> chapters -> pages
      const results: any = {
        manga: { inserted: 0, updated: 0, errors: [] },
        chapters: { inserted: 0, updated: 0, skipped: 0, errors: [] },
        pages: { inserted: 0, skipped: 0, errors: [] }
      }
      
      // Step 1: Sync all manga
      const mangaResult = await client.queryObject(`SELECT * FROM manga`)
      console.log(`Starting full sync: ${mangaResult.rows.length} manga found`)
      
      let mangaMapping: Record<string, string> = {}
      
      for (const manga of mangaResult.rows as any[]) {
        try {
          const slug = manga.slug || manga.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          
          const { data: existing } = await supabase
            .from('manga')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()
          
          const mangaData = {
            title: manga.title,
            slug,
            alternative_titles: manga.alternative_titles || [],
            cover_url: manga.cover_url,
            banner_url: manga.banner_url,
            description: manga.description,
            status: manga.status,
            author: manga.author,
            artist: manga.artist,
            genres: manga.genres || [],
            rating: manga.rating || 0,
            views: manga.views || 0,
            favorites: manga.favorites || 0,
            year: manga.year,
            country: manga.country,
            language: manga.language || 'العربية',
            publisher: manga.publisher,
            tags: manga.tags || [],
            source: 'yugabyte',
            source_url: manga.source_url || `yugabyte://${manga.id}`,
          }
          
          if (existing) {
            await supabase.from('manga').update(mangaData).eq('id', existing.id)
            mangaMapping[manga.id] = existing.id
            results.manga.updated++
          } else {
            const { data: newManga } = await supabase.from('manga').insert(mangaData).select('id').single()
            if (newManga) mangaMapping[manga.id] = newManga.id
            results.manga.inserted++
          }
        } catch (e) {
          results.manga.errors.push(`${manga.title}: ${e instanceof Error ? e.message : 'Unknown'}`)
        }
      }
      
      // Step 2: Sync all chapters
      const chaptersResult = await client.queryObject(`SELECT * FROM chapters ORDER BY manga_id, chapter_number`)
      console.log(`Syncing ${chaptersResult.rows.length} chapters`)
      
      let chapterMapping: Record<string, string> = {}
      
      for (const chapter of chaptersResult.rows as any[]) {
        try {
          const supabaseMangaId = mangaMapping[chapter.manga_id]
          if (!supabaseMangaId) {
            results.chapters.skipped++
            continue
          }
          
          const { data: existing } = await supabase
            .from('chapters')
            .select('id')
            .eq('manga_id', supabaseMangaId)
            .eq('chapter_number', chapter.chapter_number)
            .maybeSingle()
          
          const chapterData = {
            manga_id: supabaseMangaId,
            chapter_number: chapter.chapter_number,
            title: chapter.title,
            source_url: chapter.source_url || `yugabyte://chapter/${chapter.id}`,
            release_date: chapter.release_date,
            views: chapter.views || 0,
          }
          
          if (existing) {
            await supabase.from('chapters').update(chapterData).eq('id', existing.id)
            chapterMapping[chapter.id] = existing.id
            results.chapters.updated++
          } else {
            const { data: newChapter } = await supabase.from('chapters').insert(chapterData).select('id').single()
            if (newChapter) chapterMapping[chapter.id] = newChapter.id
            results.chapters.inserted++
          }
        } catch (e) {
          results.chapters.errors.push(`Chapter ${chapter.chapter_number}: ${e instanceof Error ? e.message : 'Unknown'}`)
        }
      }
      
      // Step 3: Sync all pages
      const pagesResult = await client.queryObject(`SELECT * FROM chapter_pages ORDER BY chapter_id, page_number`)
      console.log(`Syncing ${pagesResult.rows.length} pages`)
      
      for (const page of pagesResult.rows as any[]) {
        try {
          const supabaseChapterId = chapterMapping[page.chapter_id]
          if (!supabaseChapterId) {
            results.pages.skipped++
            continue
          }
          
          const { data: existing } = await supabase
            .from('chapter_pages')
            .select('id')
            .eq('chapter_id', supabaseChapterId)
            .eq('page_number', page.page_number)
            .maybeSingle()
          
          if (existing) {
            results.pages.skipped++
            continue
          }
          
          await supabase.from('chapter_pages').insert({
            chapter_id: supabaseChapterId,
            page_number: page.page_number,
            image_url: page.image_url,
          })
          results.pages.inserted++
        } catch (e) {
          results.pages.errors.push(`Page ${page.page_number}: ${e instanceof Error ? e.message : 'Unknown'}`)
        }
      }
      
      await client.end()
      
      return new Response(
        JSON.stringify({ success: true, data: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await client.end()
    
    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in Yugabyte sync:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
