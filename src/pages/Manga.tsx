import { Navbar } from "@/components/Navbar";
import { MangaCard } from "@/components/MangaCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Manga = () => {
  const [mangaList, setMangaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from('manga')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Filter only manga (not manhwa or manhua)
      const filtered = data.filter(m => 
        !m.source_url?.includes('manhwa') && 
        !m.source_url?.includes('manhua')
      );
      setMangaList(filtered);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-manga-gradient bg-clip-text text-transparent">
          المانجا
        </h1>
        
        {loading ? (
          <div className="text-center py-12">جاري التحميل...</div>
        ) : mangaList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد مانجا حالياً
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {mangaList.map((manga) => (
              <MangaCard
                key={manga.id}
                id={manga.id}
                slug={manga.slug}
                title={manga.title}
                coverUrl={manga.cover_url || ''}
                rating={manga.rating || 0}
                latestChapter={`الفصل ${manga.chapters?.[0]?.chapter_number || 0}`}
                genres={manga.genres || []}
                isNew={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Manga;
