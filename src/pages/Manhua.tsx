import { Navbar } from "@/components/Navbar";
import { MangaCard } from "@/components/MangaCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Manhua = () => {
  const [manhuaList, setManhuaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManhua();
  }, []);

  const fetchManhua = async () => {
    const { data, error } = await supabase
      .from('manga')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Filter only manhua
      const filtered = data.filter(m => m.source_url?.includes('manhua'));
      setManhuaList(filtered);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-manga-gradient bg-clip-text text-transparent">
          المانها
        </h1>
        
        {loading ? (
          <div className="text-center py-12">جاري التحميل...</div>
        ) : manhuaList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد مانها حالياً
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {manhuaList.map((manga) => (
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

export default Manhua;
