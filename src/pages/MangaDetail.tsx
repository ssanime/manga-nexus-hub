import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, BookOpen, Eye, Heart, Share2, Clock, Loader2 } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const MangaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch manga data
  const { data: manga, isLoading: mangaLoading, error: mangaError } = useQuery({
    queryKey: ['manga', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manga')
        .select('*')
        .eq('slug', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Manga not found');
      return data;
    },
  });

  // Fetch chapters
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', manga?.id],
    queryFn: async () => {
      if (!manga?.id) return [];
      
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('manga_id', manga.id)
        .order('chapter_number', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!manga?.id,
  });

  // Redirect to 404 if manga not found
  useEffect(() => {
    if (mangaError) {
      navigate('/404');
    }
  }, [mangaError, navigate]);

  if (mangaLoading || chaptersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!manga) {
    return null;
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'غير محدد';
    return new Date(date).toLocaleDateString('ar-SA');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-[400px] overflow-hidden">
        {manga.cover_url && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
              style={{ backgroundImage: `url(${manga.cover_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-80 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Image */}
          <div className="flex-shrink-0">
            <Card className="w-64 overflow-hidden shadow-manga-glow border-border">
              {manga.cover_url ? (
                <img 
                  src={manga.cover_url} 
                  alt={manga.title}
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full h-96 bg-muted flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </Card>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                {manga.title}
              </h1>
              {manga.alternative_titles && manga.alternative_titles.length > 0 && (
                <div className="flex flex-wrap gap-2 text-muted-foreground">
                  {manga.alternative_titles.map((title, i) => (
                    <span key={i}>{title}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-accent fill-accent" />
                <span className="text-2xl font-bold text-foreground">{manga.rating || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-5 w-5" />
                <span>{formatViews(manga.views || 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Heart className="h-5 w-5" />
                <span>{formatViews(manga.favorites || 0)}</span>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                {manga.status === 'ongoing' ? 'مستمرة' : 'مكتملة'}
              </Badge>
            </div>

            {/* Genres */}
            {manga.genres && manga.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manga.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              {chapters.length > 0 && (
                <Link to={`/read/${manga.slug}/${chapters[chapters.length - 1].chapter_number}`}>
                  <Button className="bg-primary hover:bg-primary/90 shadow-manga-glow">
                    <BookOpen className="mr-2 h-5 w-5" />
                    ابدأ القراءة
                  </Button>
                </Link>
              )}
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
                  <div className="font-semibold text-foreground">{manga.author || 'غير محدد'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">الرسام</div>
                  <div className="font-semibold text-foreground">{manga.artist || 'غير محدد'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">سنة الإصدار</div>
                  <div className="font-semibold text-foreground">{manga.year || 'غير محدد'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">الحالة</div>
                  <div className="font-semibold text-foreground">
                    {manga.status === 'ongoing' ? 'مستمرة' : 'مكتملة'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 mb-12">
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="chapters">الفصول ({chapters.length})</TabsTrigger>
              <TabsTrigger value="description">الوصف</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chapters" className="mt-6">
              {chapters.length > 0 ? (
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <Link key={chapter.id} to={`/read/${manga.slug}/${chapter.chapter_number}`}>
                      <Card className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer border-border group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                الفصل {chapter.chapter_number}
                              </h3>
                              {chapter.title && (
                                <p className="text-sm text-muted-foreground">{chapter.title}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">{formatDate(chapter.release_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              <span className="text-sm">{formatViews(chapter.views || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="p-8 bg-card border-border text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد فصول متاحة حالياً</p>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="description" className="mt-6">
              <Card className="p-6 bg-card border-border">
                {manga.description ? (
                  <p className="text-foreground leading-relaxed text-lg">
                    {manga.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-center">لا يوجد وصف متاح</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MangaDetail;
