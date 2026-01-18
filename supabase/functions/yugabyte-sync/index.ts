import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YugabyteManga {
  id: string
  title: string
  slug?: string
  alternative_titles?: string[]
  cover_url?: string
  banner_url?: string
  description?: string
  status?: string
  author?: string
  artist?: string
  genres?: string[]
  rating?: number
  views?: number
  favorites?: number
  year?: number
  country?: string
  language?: string
  publisher?: string
  tags?: string[]
  source_url?: string
}

interface YugabyteChapter {
  id: string
  manga_id: string
  chapter_number: number
  title?: string
  source_url?: string
  release_date?: string
  views?: number
}

interface YugabyteChapterPage {
  id: string
  chapter_id: string
  page_number: number
  image_url: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const yugabyteApiKey = Deno.env.get('YUGABYTE_API_KEY')
    if (!yugabyteApiKey) {
      console.error('YUGABYTE_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Yugabyte API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, limit = 50, offset = 0 } = await req.json()

    console.log(`Yugabyte sync action: ${action}, limit: ${limit}, offset: ${offset}`)

    // Get Yugabyte Cloud API info
    // The API key is a JWT token, we need to extract account info
    const jwtPayload = JSON.parse(atob(yugabyteApiKey.split('.')[1]))
    console.log('JWT payload:', jwtPayload)
    
    const accountId = jwtPayload.accountId
    const baseUrl = 'https://cloud.yugabyte.com/api/public/v1'

    // First, get clusters to find the database connection
    const clustersResponse = await fetch(`${baseUrl}/accounts/${accountId}/projects`, {
      headers: {
        'Authorization': `Bearer ${yugabyteApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!clustersResponse.ok) {
      const errorText = await clustersResponse.text()
      console.error('Failed to fetch Yugabyte projects:', errorText)
      
      // Try alternative approach - direct cluster access
      const altResponse = await fetch(`${baseUrl}/clusters`, {
        headers: {
          'Authorization': `Bearer ${yugabyteApiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!altResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to connect to Yugabyte Cloud API',
            details: errorText
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const clusters = await altResponse.json()
      console.log('Yugabyte clusters:', clusters)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { clusters, accountId },
          message: 'Connected to Yugabyte Cloud. Please provide database connection details.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const projects = await clustersResponse.json()
    console.log('Yugabyte projects:', projects)

    // For now, return connection info
    // The actual database query would need YSQL connection which requires
    // host, port, database name, user, and the JWT as password
    
    if (action === 'test') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            accountId,
            projects,
            message: 'Successfully connected to Yugabyte Cloud API'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'list_clusters') {
      // Get all clusters
      const clustersListResponse = await fetch(`${baseUrl}/accounts/${accountId}/clusters`, {
        headers: {
          'Authorization': `Bearer ${yugabyteApiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (clustersListResponse.ok) {
        const clustersList = await clustersListResponse.json()
        return new Response(
          JSON.stringify({ success: true, data: clustersList }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Return what we have
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          accountId,
          projects,
          instructions: 'To sync manga data, please provide the database connection details (host, port, database name) from your Yugabyte cluster.'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
