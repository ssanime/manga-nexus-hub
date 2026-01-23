import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import { BentoGrid, PopularSection, TrendingSection } from "@/components/home/BentoGrid";
import { QuickAccessCards } from "@/components/home/QuickAccessCards";
import { LatestChaptersGrid } from "@/components/home/LatestChaptersGrid";
import { StatsSection } from "@/components/home/StatsSection";
import { Footer } from "@/components/home/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [trendingManga, setTrendingManga] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);

  useEffect(() => {
    checkAdminRole();
    fetchManga();
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

  const fetchManga = async () => {
    // Fetch popular manga (most viewed)
    const { data: popular } = await supabase
      .from('manga')
      .select('id, slug, title, cover_url, rating, views, genres')
      .eq('publish_status', 'published')
      .order('views', { ascending: false })
      .limit(20);
    
    // Fetch trending manga (recently updated with high views)
    const { data: trending } = await supabase
      .from('manga')
      .select('id, slug, title, cover_url, rating, views, genres')
      .eq('publish_status', 'published')
      .order('updated_at', { ascending: false })
      .limit(20);

    // Fetch new releases
    const { data: newData } = await supabase
      .from('manga')
      .select('id, slug, title, cover_url, rating, views, genres')
      .eq('publish_status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (popular) setPopularManga(popular);
    if (trending) setTrendingManga(trending);
    if (newData) setNewReleases(newData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Admin FAB */}
      {isAdmin && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-8 left-8 z-50"
        >
          <Button 
            onClick={() => navigate('/admin')}
            size="lg"
            className="shadow-lg shadow-primary/30 gap-2"
          >
            <Settings className="w-5 h-5" />
            لوحة التحكم
          </Button>
        </motion.div>
      )}
      
      {/* Hero Section with Animated Carousel */}
      <AnimatedHero />

      {/* Quick Access Cards */}
      <div className="container mx-auto px-4">
        <QuickAccessCards />
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4">
        <StatsSection />
      </div>

      {/* Popular Manga - Large Grid */}
      <div className="container mx-auto px-4">
        <PopularSection items={popularManga} />
      </div>

      {/* Trending - Medium Grid with Background */}
      <div className="bg-card/30">
        <div className="container mx-auto px-4">
          <TrendingSection items={trendingManga} />
        </div>
      </div>

      {/* New Releases */}
      <div className="container mx-auto px-4">
        <BentoGrid
          title="إصدارات جديدة"
          icon={<motion.span whileHover={{ rotate: 15 }}>✨</motion.span>}
          items={newReleases}
          variant="medium"
        />
      </div>

      {/* Latest Chapters */}
      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <LatestChaptersGrid />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
