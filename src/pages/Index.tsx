import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { MangaCarousel } from "@/components/MangaCarousel";
import { LatestChapters } from "@/components/LatestChapters";
import { Button } from "@/components/ui/button";
import { Settings, ArrowRight, Flame, TrendingUp, Clock } from "lucide-react";
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

  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [trendingManga, setTrendingManga] = useState<any[]>([]);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    // Fetch popular manga (most viewed/rated)
    const { data: popular } = await supabase
      .from('manga')
      .select('*')
      .eq('publish_status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Fetch trending manga
    const { data: trending } = await supabase
      .from('manga')
      .select('*')
      .eq('publish_status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (popular) setPopularManga(popular);
    if (trending) setTrendingManga(trending);
  };

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

      {/* Popular Manga - Large Carousel */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flame className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">الأعمال الشعبية</h2>
          </div>
          <Link to="/popular">
            <Button variant="ghost" className="group">
              عرض الكل
              <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        <MangaCarousel manga={popularManga} size="large" />
      </section>

      {/* Trending - Medium Carousel */}
      <section className="container mx-auto px-4 py-12 bg-card/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-accent" />
            <h2 className="text-3xl font-bold text-foreground">الأعمال الرائجة</h2>
          </div>
          <Link to="/browse">
            <Button variant="ghost" className="group">
              عرض الكل
              <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        <MangaCarousel manga={trendingManga} size="medium" />
      </section>

      {/* Latest Chapters */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">آخر الفصول</h2>
          </div>
          <Link to="/recent">
            <Button variant="ghost" className="group">
              عرض الكل
              <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        <LatestChapters />
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
