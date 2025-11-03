import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, BookOpen, Eye, Heart, Share2, Clock, Loader2, Image as ImageIcon } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ChapterCardProps {
  chapter: any;
  mangaSlug: string;
  formatDate: (date: string | null) => string;
  formatViews: (views: number) => string;
}

const ChapterCard = ({ chapter, mangaSlug, formatDate, formatViews }: ChapterCardProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPreviewImage = async () => {
      const { data } = await supabase
        .from("chapter_pages")
        .select("image_url")
        .eq("chapter_id", chapter.id)
        .order("page_number", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (data?.image_url) {
        setPreviewImage(data.image_url);
      }
    };
    
    fetchPreviewImage();
  }, [chapter.id]);

  return (
    <Link to={`/read/${mangaSlug}/${chapter.chapter_number}`}>
      <Card className="overflow-hidden hover:bg-secondary/50 transition-all cursor-pointer border-border group hover:border-primary/50">
        <div className="flex gap-4 p-4">
          {/* Preview Image */}
          <div className="relative w-20 h-28 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
            {previewImage ? (
              <img
                src={previewImage}
                alt={`الفصل ${chapter.chapter_number}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Chapter Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="bg-primary/10 w-fit p-2 rounded-lg group-hover:bg-primary/20 transition-colors mb-2">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                الفصل {chapter.chapter_number}
              </h3>
              {chapter.title && (
                <p className="text-sm text-muted-foreground line-clamp-1">{chapter.title}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{formatViews(chapter.views || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(chapter.release_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

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
        {(manga.banner_url || manga.cover_url) && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
              style={{ backgroundImage: `url(${manga.banner_url || manga.cover_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        )}
        {manga.trailer_url && (
          <div className="absolute top-4 right-4 z-10">
            <a 
              href={manga.trailer_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span>مقطع ترويجي</span>
            </a>
          </div>
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
              {manga.chapter_count !== undefined && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-5 w-5" />
                  <span>{manga.chapter_count} فصل</span>
                </div>
              )}
              <Badge className="bg-primary text-primary-foreground">
                {manga.status === 'ongoing' ? 'مستمرة' : 'مكتملة'}
              </Badge>
              {manga.is_featured && (
                <Badge className="bg-accent text-accent-foreground">
                  <Star className="h-3 w-3 ml-1" />
                  مميزة
                </Badge>
              )}
            </div>

            {/* Genres */}
            {manga.genres && manga.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manga.genres.map((genre) => (
                  <Badge 
                    key={genre} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      // Navigate to manga page with genre filter
                      const genreFilter = encodeURIComponent(genre);
                      window.location.href = `/manga?genre=${genreFilter}`;
                    }}
                  >
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
                {manga.publisher && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">الناشر</div>
                    <div className="font-semibold text-foreground">{manga.publisher}</div>
                  </div>
                )}
                {manga.country && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">بلد الأصل</div>
                    <div className="font-semibold text-foreground">
                      {manga.country === 'japan' ? 'اليابان' : 
                       manga.country === 'korea' ? 'كوريا' : 
                       manga.country === 'china' ? 'الصين' : 'أخرى'}
                    </div>
                  </div>
                )}
                {manga.language && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">اللغة</div>
                    <div className="font-semibold text-foreground">{manga.language}</div>
                  </div>
                )}
                {manga.release_date && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">تاريخ الإصدار</div>
                    <div className="font-semibold text-foreground">{formatDate(manga.release_date)}</div>
                  </div>
                )}
              </div>

              {/* External Links */}
              {manga.external_links && typeof manga.external_links === 'object' && !Array.isArray(manga.external_links) && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-3">روابط خارجية</div>
                  <div className="flex flex-wrap gap-2">
                    {(manga.external_links as any).mal && (
                      <a 
                        href={(manga.external_links as any).mal as string} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
                      >
                        MyAnimeList
                      </a>
                    )}
                    {(manga.external_links as any).anilist && (
                      <a 
                        href={(manga.external_links as any).anilist as string} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
                      >
                        AniList
                      </a>
                    )}
                    {(manga.external_links as any).official && (
                      <a 
                        href={(manga.external_links as any).official as string} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
                      >
                        الموقع الرسمي
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {manga.tags && manga.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-3">الكلمات المفتاحية</div>
                  <div className="flex flex-wrap gap-2">
                    {manga.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 mb-12">
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="chapters">الفصول ({chapters.length})</TabsTrigger>
              <TabsTrigger value="description">الوصف</TabsTrigger>
              <TabsTrigger value="gallery">المعرض</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chapters" className="mt-6">
              {chapters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chapters.map((chapter) => (
                    <ChapterCard 
                      key={chapter.id}
                      chapter={chapter}
                      mangaSlug={manga.slug}
                      formatDate={formatDate}
                      formatViews={formatViews}
                    />
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

            <TabsContent value="gallery" className="mt-6">
              {manga.gallery && manga.gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {manga.gallery.map((image, index) => (
                    <Card key={index} className="overflow-hidden group cursor-pointer">
                      <img 
                        src={image} 
                        alt={`${manga.title} - معرض ${index + 1}`}
                        className="w-full h-64 object-cover transition-transform group-hover:scale-110"
                        onClick={() => window.open(image, '_blank')}
                      />
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 bg-card border-border text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد صور في المعرض</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MangaDetail;
