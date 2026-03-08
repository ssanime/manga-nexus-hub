import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import { GenreExplorer } from "@/components/home/GenreExplorer";
import { EditorsPick } from "@/components/home/EditorsPick";
import { MangaShowcase } from "@/components/home/MangaShowcase";
import { CinematicBanner } from "@/components/home/CinematicBanner";
import { LatestChaptersGrid } from "@/components/home/LatestChaptersGrid";
import { Footer } from "@/components/home/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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
    checkAdminRole();
  }, []);

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
      
      {/* 1. Hero - Cinematic featured slider */}
      <AnimatedHero />

      {/* 2. Category Banners - Manga/Manhwa/Manhua with cover collages */}
      <div className="container mx-auto px-4">
        <CinematicBanner />
      </div>

      {/* 3. Popular Showcase - Horizontal 3D scroll */}
      <div className="container mx-auto px-4">
        <MangaShowcase title="الأكثر مشاهدة" query="popular" />
      </div>

      {/* 4. Editor's Pick - Cinematic single spotlight */}
      <EditorsPick />

      {/* 5. Genre Explorer - Visual category tiles */}
      <div className="container mx-auto px-4">
        <GenreExplorer />
      </div>

      {/* 6. New Releases - Horizontal scroll */}
      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <MangaShowcase title="إصدارات جديدة" query="new" />
        </div>
      </div>

      {/* 7. Recently Updated - Horizontal scroll */}
      <div className="container mx-auto px-4">
        <MangaShowcase title="آخر التحديثات" query="updated" />
      </div>

      {/* 8. Latest Chapters Grid */}
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
