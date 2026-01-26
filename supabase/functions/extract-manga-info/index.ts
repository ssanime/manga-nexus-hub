import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, mangaId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracting manga info from:", url);

    // Step 1: Scrape the page content
    let pageContent = "";
    
    if (FIRECRAWL_API_KEY) {
      console.log("Using Firecrawl to scrape page...");
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (scrapeResponse.ok) {
        const scrapeData = await scrapeResponse.json();
        pageContent = scrapeData.data?.markdown || scrapeData.markdown || "";
        console.log("Scraped content length:", pageContent.length);
      }
    }

    if (!pageContent) {
      // Fallback: simple fetch
      console.log("Firecrawl failed or not available, trying direct fetch...");
      try {
        const directResponse = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ar,en;q=0.9",
          },
        });
        const html = await directResponse.text();
        // Extract text content from HTML (basic)
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 15000);
      } catch (e) {
        console.error("Direct fetch failed:", e);
      }
    }

    if (!pageContent || pageContent.length < 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Could not extract page content" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Use AI to extract structured data
    console.log("Using Lovable AI to extract manga info...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت خبير في استخراج معلومات المانجا والمانهوا من صفحات الويب العربية والإنجليزية.
            
استخرج المعلومات التالية من محتوى الصفحة المقدم:
- العنوان (title)
- القصة/الوصف (description) - قم بتنظيفها وكتابتها بشكل جيد
- الأنواع/التصنيفات (genres) - قائمة بأسماء التصنيفات
- المؤلف (author)
- الرسام (artist)
- الحالة (status) - ongoing أو completed
- سنة الإصدار (year)
- البلد الأصلي (country) - japan, korea, china أو other

كن دقيقاً واستخرج فقط المعلومات الموجودة. إذا لم تجد معلومة معينة، اتركها فارغة.`
          },
          {
            role: "user",
            content: `استخرج معلومات المانجا من هذا المحتوى:\n\n${pageContent.substring(0, 12000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_manga_info",
              description: "Extract structured manga information from page content",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Manga title" },
                  description: { type: "string", description: "Story description in Arabic" },
                  genres: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of genres in Arabic"
                  },
                  author: { type: "string", description: "Author name" },
                  artist: { type: "string", description: "Artist name" },
                  status: { 
                    type: "string", 
                    enum: ["ongoing", "completed"],
                    description: "Publication status"
                  },
                  year: { type: "number", description: "Release year" },
                  country: {
                    type: "string",
                    enum: ["japan", "korea", "china", "other"],
                    description: "Country of origin"
                  },
                  alternative_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Alternative titles"
                  }
                },
                required: ["title"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_manga_info" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "AI extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData, null, 2));

    // Extract the function call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ success: false, error: "AI could not extract information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedInfo = JSON.parse(toolCall.function.arguments);
    console.log("Extracted info:", extractedInfo);

    // Step 3: Update manga in database if mangaId provided
    if (mangaId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const updateData: Record<string, any> = {};
      
      if (extractedInfo.description) updateData.description = extractedInfo.description;
      if (extractedInfo.genres?.length > 0) updateData.genres = extractedInfo.genres;
      if (extractedInfo.author) updateData.author = extractedInfo.author;
      if (extractedInfo.artist) updateData.artist = extractedInfo.artist;
      if (extractedInfo.status) updateData.status = extractedInfo.status;
      if (extractedInfo.year) updateData.year = extractedInfo.year;
      if (extractedInfo.country) updateData.country = extractedInfo.country;
      if (extractedInfo.alternative_titles?.length > 0) {
        updateData.alternative_titles = extractedInfo.alternative_titles;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("manga")
          .update(updateData)
          .eq("id", mangaId);

        if (updateError) {
          console.error("Database update error:", updateError);
        } else {
          console.log("Manga updated successfully");
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedInfo
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error extracting manga info:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
