import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MangaCarousel } from "./MangaCarousel";

export const HeroSection = () => {
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [popularManhwa, setPopularManhwa] = useState<any[]>([]);
  const [popularManhua, setPopularManhua] = useState<any[]>([]);

  useEffect(() => {
    const fetchPopularContent = async () => {
      // Fetch popular Manga
      const { data: manga } = await supabase
        .from("manga")
        .select("*")
        .contains("genres", ["Manga"])
        .order("views", { ascending: false })
        .limit(10);
      
      // Fetch popular Manhwa
      const { data: manhwa } = await supabase
        .from("manga")
        .select("*")
        .contains("genres", ["Manhwa"])
        .order("views", { ascending: false })
        .limit(10);
      
      // Fetch popular Manhua
      const { data: manhua } = await supabase
        .from("manga")
        .select("*")
        .contains("genres", ["Manhua"])
        .order("views", { ascending: false })
        .limit(10);

      setPopularManga(manga || []);
      setPopularManhwa(manhwa || []);
      setPopularManhua(manhua || []);
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
        {/* Popular Manga */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
            <span className="bg-manga-gradient bg-clip-text text-transparent">
              المانجا المشهورة
            </span>
          </h2>
          {popularManga.length > 0 && (
            <MangaCarousel manga={popularManga} size="large" />
          )}
        </div>

        {/* Popular Manhwa */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
            <span className="bg-manga-gradient bg-clip-text text-transparent">
              المانهوات المشهورة
            </span>
          </h2>
          {popularManhwa.length > 0 && (
            <MangaCarousel manga={popularManhwa} size="large" />
          )}
        </div>

        {/* Popular Manhua */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
            <span className="bg-manga-gradient bg-clip-text text-transparent">
              المانهات المشهورة
            </span>
          </h2>
          {popularManhua.length > 0 && (
            <MangaCarousel manga={popularManhua} size="large" />
          )}
        </div>
      </div>
    </section>
  );
};
