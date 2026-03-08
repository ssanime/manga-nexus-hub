import { Navbar } from "@/components/Navbar";
import { MangaCard } from "@/components/MangaCard";
import { AdvancedFilters, FilterState } from "@/components/AdvancedFilters";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookText } from "lucide-react";
import { motion } from "framer-motion";

const Novels = () => {
  const [novelList, setNovelList] = useState<any[]>([]);
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNovels();
  }, []);

  const fetchNovels = async () => {
    const { data, error } = await supabase
      .from('manga')
      .select('*')
      .eq('type', 'novel')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const filtered = data.filter(m => m.title && m.title.trim() !== '');
      setNovelList(filtered);
      setFilteredList(filtered);
    }
    setLoading(false);
  };

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...novelList];

    if (filters.search) {
      filtered = filtered.filter(m => 
        m.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        m.alternative_titles?.some((t: string) => t.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    if (filters.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }

    if (filters.year) {
      filtered = filtered.filter(m => m.year === parseInt(filters.year));
    }

    if (filters.minRating) {
      filtered = filtered.filter(m => (m.rating || 0) >= parseFloat(filters.minRating));
    }

    if (filters.genres.length > 0) {
      filtered = filtered.filter(m => {
        const mangaGenres = m.genres || [];
        return filters.genres.every(genre => mangaGenres.includes(genre));
      });
    }

    switch (filters.sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
        break;
      case 'updated':
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredList(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <BookText className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold bg-manga-gradient bg-clip-text text-transparent">
            الروايات
          </h1>
        </motion.div>

        <AdvancedFilters onFilterChange={handleFilterChange} />
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {novelList.length === 0 ? 'لا توجد روايات حالياً' : 'لا توجد نتائج تطابق الفلاتر المحددة'}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              عرض {filteredList.length} من أصل {novelList.length} رواية
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredList.map((novel) => (
                <MangaCard
                  key={novel.id}
                  id={novel.id}
                  slug={novel.slug}
                  title={novel.title}
                  coverUrl={novel.cover_url || ''}
                  rating={novel.rating || 0}
                  latestChapter={`الفصل ${novel.chapter_count || 0}`}
                  genres={novel.genres || []}
                  isNew={false}
                  detailPath={`/novel/${novel.slug}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Novels;
