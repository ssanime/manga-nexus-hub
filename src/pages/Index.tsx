import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { MangaCard } from "@/components/MangaCard";
import { Button } from "@/components/ui/button";
import { Settings, ArrowRight, Flame, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (roles && roles.some(r => r.role === 'admin')) {
        setIsAdmin(true);
      }
    }
  };

  const [mangaList, setMangaList] = useState<any[]>([]);

  useEffect(() => {
    fetchManga();
  }, [checkAdminRole]);

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from('manga')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(18);
    
    if (!error && data) {
      setMangaList(data);
    }
  };

  const featuredManga = mangaList.slice(0, 6);
  const recentlyUpdated = mangaList.slice(0, 4);
  const trending = mangaList.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {isAdmin && (
        <div className="fixed bottom-8 left-8 z-50">
          <Button 
            onClick={() => navigate('/admin')}
            size="lg"
            className="shadow-lg"
          >
            <Settings className="w-5 h-5 mr-2" />
            لوحة التحكم
          </Button>
        </div>
      )}
      
      <HeroSection />

      {/* Featured Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Flame className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">المانجا المميزة</h2>
          </div>
          <Link to="/browse">
            <Button variant="ghost" className="group">
              عرض الكل
              <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
          {featuredManga.map((manga) => (
            <MangaCard 
              key={manga.id}
              id={manga.id}
              slug={manga.slug}
              title={manga.title}
              coverUrl={manga.cover_url || ''}
              rating={manga.rating || 0}
              latestChapter="جديد"
              genres={manga.genres || []}
              isNew={true}
            />
          ))}
        </div>
      </section>

      {/* Recently Updated */}
      <section className="container mx-auto px-4 py-16 bg-card/30">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-accent" />
            <h2 className="text-3xl font-bold text-foreground">آخر التحديثات</h2>
          </div>
          <Link to="/recent">
            <Button variant="ghost" className="group">
              عرض الكل
              <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {recentlyUpdated.map((manga) => (
            <MangaCard 
              key={manga.id}
              id={manga.id}
              slug={manga.slug}
              title={manga.title}
              coverUrl={manga.cover_url || ''}
              rating={manga.rating || 0}
              latestChapter="محدث"
              genres={manga.genres || []}
              isNew={false}
            />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Star className="h-7 w-7 text-primary fill-primary" />
            <h2 className="text-3xl font-bold text-foreground">الأكثر شعبية</h2>
          </div>
          <Link to="/popular">
            <Button variant="ghost" className="group">
              عرض الكل
              <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {trending.map((manga) => (
            <MangaCard 
              key={manga.id}
              id={manga.id}
              slug={manga.slug}
              title={manga.title}
              coverUrl={manga.cover_url || ''}
              rating={manga.rating || 0}
              latestChapter="شائع"
              genres={manga.genres || []}
              isNew={false}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <img src="/placeholder.svg" alt="Mangafas" className="h-8 w-8" />
              <span className="text-2xl font-bold bg-manga-gradient bg-clip-text text-transparent">
                Mangafas
              </span>
            </div>
            <p className="text-muted-foreground">
              أفضل موقع لقراءة المانجا والمانهوا مترجمة للعربية
            </p>
            <p className="text-sm text-muted-foreground">
              © 2024 Mangafas. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
