import { Navbar } from "@/components/Navbar";
import { MangaCard } from "@/components/MangaCard";
import { AdvancedFilters, FilterState } from "@/components/AdvancedFilters";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Manhua = () => {
  const [manhuaList, setManhuaList] = useState<any[]>([]);
  const [filteredList, setFilteredList] = useState<any[]>([]);
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
      const filtered = data.filter(m => 
        m.source_url?.includes('manhua') &&
        m.title && m.title.trim() !== ''
      );
      setManhuaList(filtered);
      setFilteredList(filtered);
    }
    setLoading(false);
  };

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...manhuaList];

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
        <h1 className="text-4xl font-bold mb-8 bg-manga-gradient bg-clip-text text-transparent">
          المانها
        </h1>

        <AdvancedFilters onFilterChange={handleFilterChange} />
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {manhuaList.length === 0 ? 'لا توجد مانها حالياً' : 'لا توجد نتائج تطابق الفلاتر المحددة'}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              عرض {filteredList.length} من أصل {manhuaList.length} مانها
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredList.map((manga) => (
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
          </>
        )}
      </div>
    </div>
  );
};

export default Manhua;
