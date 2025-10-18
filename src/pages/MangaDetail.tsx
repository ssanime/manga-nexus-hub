import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, BookOpen, Eye, Heart, Share2, Clock } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const MangaDetail = () => {
  const { id } = useParams();

  // Mock data - will be replaced with real data
  const manga = {
    id: id || "1",
    title: "هجوم العمالقة",
    alternativeTitles: ["Attack on Titan", "Shingeki no Kyojin"],
    coverUrl: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=800&h=1200&fit=crop",
    description: "في عالم يسكنه العمالقة الذين يلتهمون البشر، يعيش البشر خلف أسوار عالية للحماية. لكن حياة إرين ييغر تتغير جذرياً عندما يخترق عملاق ضخم الأسوار ويدمر مدينته، مما يؤدي إلى موت والدته. يقسم إرين على الانتقام والقضاء على جميع العمالقة.",
    rating: 9.2,
    status: "مكتمل",
    author: "هاجيمي إيساياما",
    artist: "هاجيمي إيساياما",
    genres: ["أكشن", "دراما", "فانتازيا", "غموض", "إثارة"],
    views: "5.2M",
    favorites: "350K",
    year: 2009,
    chapters: [
      { id: "1", number: 139, title: "نحو الشجرة على ذلك التل", releaseDate: "2021-04-09", views: "2.5M" },
      { id: "2", number: 138, title: "خائن", releaseDate: "2021-03-09", views: "2.3M" },
      { id: "3", number: 137, title: "العمالقة", releaseDate: "2021-02-09", views: "2.1M" },
      { id: "4", number: 136, title: "النصر الأخير", releaseDate: "2021-01-09", views: "2.0M" },
      { id: "5", number: 135, title: "المعركة في السماء والأرض", releaseDate: "2020-12-09", views: "1.9M" },
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-[400px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
          style={{ backgroundImage: `url(${manga.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-80 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Image */}
          <div className="flex-shrink-0">
            <Card className="w-64 overflow-hidden shadow-manga-glow border-border">
              <img 
                src={manga.coverUrl} 
                alt={manga.title}
                className="w-full h-auto"
              />
            </Card>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                {manga.title}
              </h1>
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                {manga.alternativeTitles.map((title, i) => (
                  <span key={i}>{title}</span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-accent fill-accent" />
                <span className="text-2xl font-bold text-foreground">{manga.rating}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-5 w-5" />
                <span>{manga.views}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Heart className="h-5 w-5" />
                <span>{manga.favorites}</span>
              </div>
              <Badge className="bg-primary text-primary-foreground">{manga.status}</Badge>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {manga.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <Link to={`/read/${manga.id}/1`}>
                <Button className="bg-primary hover:bg-primary/90 shadow-manga-glow">
                  <BookOpen className="mr-2 h-5 w-5" />
                  ابدأ القراءة
                </Button>
              </Link>
              <Button variant="outline">
                <Heart className="mr-2 h-5 w-5" />
                أضف للمفضلة
              </Button>
              <Button variant="outline">
                <Share2 className="mr-2 h-5 w-5" />
                مشاركة
              </Button>
            </div>

            {/* Details */}
            <Card className="p-6 bg-card border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">المؤلف</div>
                  <div className="font-semibold text-foreground">{manga.author}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">الرسام</div>
                  <div className="font-semibold text-foreground">{manga.artist}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">سنة الإصدار</div>
                  <div className="font-semibold text-foreground">{manga.year}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">الحالة</div>
                  <div className="font-semibold text-foreground">{manga.status}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 mb-12">
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="chapters">الفصول</TabsTrigger>
              <TabsTrigger value="description">الوصف</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chapters" className="mt-6">
              <div className="space-y-2">
                {manga.chapters.map((chapter) => (
                  <Link key={chapter.id} to={`/read/${manga.id}/${chapter.number}`}>
                    <Card className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer border-border group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              الفصل {chapter.number}
                            </h3>
                            <p className="text-sm text-muted-foreground">{chapter.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{chapter.releaseDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">{chapter.views}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="description" className="mt-6">
              <Card className="p-6 bg-card border-border">
                <p className="text-foreground leading-relaxed text-lg">
                  {manga.description}
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MangaDetail;
