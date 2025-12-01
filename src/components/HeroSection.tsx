import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MangaCarousel } from "./MangaCarousel";

export const HeroSection = () => {
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [popularManhwa, setPopularManhwa] = useState<any[]>([]);
  const [popularManhua, setPopularManhua] = useState<any[]>([]);

  useEffect(() => {
    const fetchPopularContent = async () => {
      // Fetch "الأعمال الرائجة" - Trending Works
      const { data: trending } = await supabase
        .from("manga")
        .select("*")
        .eq('publish_status', 'published')
        .contains("genres", ["رائج"])
        .order("views", { ascending: false })
        .limit(10);
      
      // Fetch "الأعمال الشعبية" - Popular Works
      const { data: popular } = await supabase
        .from("manga")
        .select("*")
        .eq('publish_status', 'published')
        .contains("genres", ["شعبي"])
        .order("views", { ascending: false })
        .limit(10);
      
      // Fetch "المانجا المشهورة" - Featured/Famous Manga
      const { data: featured } = await supabase
        .from("manga")
        .select("*")
        .eq('publish_status', 'published')
        .eq('is_featured', true)
        .order("views", { ascending: false })
        .limit(10);

      setPopularManga(featured || []);
      setPopularManhwa(trending || []);
      setPopularManhua(popular || []);
    };

    fetchPopularContent();
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-card via-background to-card py-8 md:py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-accent/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10 mx-auto px-4 space-y-12">
        {/* المانجا المشهورة - Featured/Famous */}
        {popularManga.length > 0 && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              <span className="bg-manga-gradient bg-clip-text text-transparent">
                المانجا المشهورة
              </span>
            </h2>
            <MangaCarousel manga={popularManga} size="large" />
          </div>
        )}

        {/* الأعمال الرائجة - Trending Works */}
        {popularManhwa.length > 0 && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              <span className="bg-manga-gradient bg-clip-text text-transparent">
                الأعمال الرائجة
              </span>
            </h2>
            <MangaCarousel manga={popularManhwa} size="large" />
          </div>
        )}

        {/* الأعمال الشعبية - Popular Works */}
        {popularManhua.length > 0 && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              <span className="bg-manga-gradient bg-clip-text text-transparent">
                الأعمال الشعبية
              </span>
            </h2>
            <MangaCarousel manga={popularManhua} size="large" />
          </div>
        )}
      </div>
    </section>
  );
};
