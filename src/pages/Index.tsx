import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { MangaCard } from "@/components/MangaCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Temporary mock data - will be replaced with real data from database
  const featuredManga = [
    {
      id: "1",
      title: "هجوم العمالقة",
      coverUrl: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop",
      rating: 9.2,
      latestChapter: "الفصل 139",
      genres: ["أكشن", "دراما", "فانتازيا"],
      isNew: false,
    },
    {
      id: "2",
      title: "ون بيس",
      coverUrl: "https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=400&h=600&fit=crop",
      rating: 9.5,
      latestChapter: "الفصل 1100",
      genres: ["مغامرات", "أكشن", "كوميديا"],
      isNew: true,
    },
    {
      id: "3",
      title: "ناروتو",
      coverUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=600&fit=crop",
      rating: 8.9,
      latestChapter: "الفصل 700",
      genres: ["أكشن", "مغامرات", "فنون قتالية"],
      isNew: false,
    },
    {
      id: "4",
      title: "قاتل الشياطين",
      coverUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop",
      rating: 9.0,
      latestChapter: "الفصل 205",
      genres: ["أكشن", "خيال", "خارق للطبيعة"],
      isNew: false,
    },
    {
      id: "5",
      title: "طوكيو غول",
      coverUrl: "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400&h=600&fit=crop",
      rating: 8.7,
      latestChapter: "الفصل 179",
      genres: ["رعب", "أكشن", "دراما"],
      isNew: false,
    },
    {
      id: "6",
      title: "مذكرة الموت",
      coverUrl: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop",
      rating: 9.1,
      latestChapter: "الفصل 108",
      genres: ["إثارة", "غموض", "خارق للطبيعة"],
      isNew: false,
    },
  ];

  const recentlyUpdated = featuredManga.slice(0, 4);
  const trending = featuredManga.slice(2, 6);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
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
            <MangaCard key={manga.id} {...manga} />
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
            <MangaCard key={manga.id} {...manga} />
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
            <MangaCard key={manga.id} {...manga} />
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
