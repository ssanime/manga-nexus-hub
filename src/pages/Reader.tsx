import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Home, List, X, Loader2, Heart, Share2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Reader = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [manga, setManga] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [rescraping, setRescraping] = useState(false);

  useEffect(() => {
    checkUser();
  }, [manga]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user && manga) {
      checkFavorite(user.id);
    }
  };

  const checkFavorite = async (userId: string) => {
    if (!manga) return;
    const { data } = await supabase
      .from('manga_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('manga_id', manga.id)
      .maybeSingle();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول لإضافة مانجا للمفضلة",
        variant: "destructive",
      });
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('manga_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('manga_id', manga.id);

      if (!error) {
        setIsFavorite(false);
        toast({
          title: "تم الإزالة",
          description: "تم إزالة المانجا من المفضلة",
        });
      }
    } else {
      const { error } = await supabase
        .from('manga_favorites')
        .insert({
          user_id: user.id,
          manga_id: manga.id,
        });

      if (!error) {
        setIsFavorite(true);
        toast({
          title: "تمت الإضافة",
          description: "تمت إضافة المانجا للمفضلة",
        });
      }
    }
  };

  const shareChapter = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${manga.title} - الفصل ${chapter.chapter_number}`,
          text: `اقرأ ${manga.title} الفصل ${chapter.chapter_number} على Mangafas`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط الفصل",
      });
    }
  };

  const scrapeAndReloadPages = async (mangaData: any, chapterData: any) => {
    setRescraping(true);
    toast({
      title: "جاري التحديث",
      description: "جاري سحب صفحات الفصل من المصدر...",
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url: chapterData.source_url,
          jobType: 'pages',
          chapterId: chapterData.id,
          source: mangaData.source,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (response.error) {
        console.error('Scraping error:', response.error);
        throw response.error;
      }

      const { data: newPagesData, error: reloadError } = await supabase
        .from('chapter_pages')
        .select('*')
        .eq('chapter_id', chapterData.id)
        .order('page_number', { ascending: true });

      if (reloadError) throw reloadError;

      const urls = newPagesData?.map((p) => p.image_url) || [];
      setPages(urls);

      toast({
        title: "تم بنجاح",
        description: `تم تحميل ${urls.length} صفحة`,
      });
    } catch (err) {
      console.error('Failed to scrape pages:', err);
      toast({
        title: "خطأ",
        description: "فشل سحب صفحات الفصل. حاول مرة أخرى لاحقاً",
        variant: "destructive",
      });
    } finally {
      setRescraping(false);
    }
  };

  useEffect(() => {
    loadChapterData();
  }, [mangaId, chapterId]);

  // Track reading history and views
  const trackReadingProgress = async (mangaData: any, chapterData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if already in reading history
      const { data: existingHistory } = await supabase
        .from('reading_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('manga_id', mangaData.id)
        .eq('chapter_id', chapterData.id)
        .maybeSingle();
      
      if (existingHistory) {
        // Update existing entry
        await supabase
          .from('reading_history')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existingHistory.id);
      } else {
        // Insert new entry and increment views only for first time
        await supabase
          .from('reading_history')
          .insert({
            user_id: user.id,
            manga_id: mangaData.id,
            chapter_id: chapterData.id,
          });
        
        // Increment chapter views only once per user
        await supabase
          .from('chapters')
          .update({ views: (chapterData.views || 0) + 1 })
          .eq('id', chapterData.id);
        
        // Increment manga views only once per user per chapter
        await supabase
          .from('manga')
          .update({ views: (mangaData.views || 0) + 1 })
          .eq('id', mangaData.id);
      }
    }
  };

  const loadChapterData = async () => {
    try {
      setLoading(true);
      
      // Get manga info
      const { data: mangaData, error: mangaError } = await supabase
        .from('manga')
        .select('*')
        .eq('slug', mangaId)
        .single();

      if (mangaError || !mangaData) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المانجا",
          variant: "destructive",
        });
        navigate('/404');
        return;
      }

      setManga(mangaData);

      // Get all chapters for navigation
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('manga_id', mangaData.id)
        .order('chapter_number', { ascending: true });

      if (chaptersError) {
        console.error('Error loading chapters:', chaptersError);
      } else {
        setAllChapters(chaptersData || []);
      }

      // Get current chapter
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('manga_id', mangaData.id)
        .eq('chapter_number', Number(chapterId))
        .single();

      if (chapterError || !chapterData) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على الفصل",
          variant: "destructive",
        });
        navigate(`/manga/${mangaId}`);
        return;
      }

      setChapter(chapterData);
      
      // Track reading progress and views
      await trackReadingProgress(mangaData, chapterData);

      // Get chapter pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('chapter_pages')
        .select('*')
        .eq('chapter_id', chapterData.id)
        .order('page_number', { ascending: true });

      if (pagesError) {
        console.error('Error loading pages:', pagesError);
        toast({
          title: "خطأ",
          description: "فشل تحميل صفحات الفصل",
          variant: "destructive",
        });
      } else if (!pagesData || pagesData.length === 0) {
        console.log('No pages found, scraping from source...');
        await scrapeAndReloadPages(mangaData, chapterData);
      } else {
        setPages(pagesData.map(p => p.image_url));
      }
    } catch (error) {
      console.error('Error loading chapter data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الفصل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevChapter = () => {
    const currentIndex = allChapters.findIndex(c => c.id === chapter?.id);
    if (currentIndex > 0) {
      const prevChapter = allChapters[currentIndex - 1];
      navigate(`/read/${mangaId}/${prevChapter.chapter_number}`);
    }
  };

  const handleNextChapter = () => {
    const currentIndex = allChapters.findIndex(c => c.id === chapter?.id);
    if (currentIndex < allChapters.length - 1) {
      const nextChapter = allChapters[currentIndex + 1];
      navigate(`/read/${mangaId}/${nextChapter.chapter_number}`);
    }
  };

  const handleChapterSelect = (value: string) => {
    navigate(`/read/${mangaId}/${value}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!manga || !chapter) {
    return null;
  }

  const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
  const hasPrevChapter = currentIndex > 0;
  const hasNextChapter = currentIndex < allChapters.length - 1;

  return (
    <div className="min-h-screen bg-black">
      {/* Top Controls */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent transition-all duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/manga/${mangaId}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <X className="h-6 w-6" />
                </Button>
              </Link>
              <div>
                <h1 className="text-white font-bold text-lg">{manga.title}</h1>
                <p className="text-gray-400 text-sm">
                  الفصل {chapter.chapter_number}
                  {chapter.title && `: ${chapter.title}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={String(chapter.chapter_number)} onValueChange={handleChapterSelect}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="اختر فصل" />
                </SelectTrigger>
                <SelectContent>
                  {allChapters.map((ch) => (
                    <SelectItem key={ch.id} value={String(ch.chapter_number)}>
                      الفصل {ch.chapter_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Link to={`/manga/${mangaId}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <List className="h-5 w-5" />
                </Button>
              </Link>

              <Link to="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>

              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={() => manga && chapter && scrapeAndReloadPages(manga, chapter)}
                disabled={rescraping}
                aria-label="تحديث صفحات الفصل"
              >
                {rescraping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={toggleFavorite}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={shareChapter}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Content */}
      <div 
        className="flex flex-col items-center justify-center min-h-screen py-20 cursor-pointer"
        onClick={() => setShowControls(!showControls)}
      >
        <div className="max-w-4xl w-full space-y-0">
          {pages.length > 0 ? (
            pages.map((page, index) => (
              <img
                key={index}
                src={page}
                alt={`الصفحة ${index + 1}`}
                className="w-full h-auto"
                loading={index > 2 ? "lazy" : "eager"}
              />
            ))
          ) : (
            <div className="text-center py-20">
              <p className="text-white text-xl">لا توجد صفحات متاحة لهذا الفصل</p>
            </div>
          )}
        </div>

        {/* End of Chapter Card */}
        <Card className="max-w-4xl w-full mt-8 p-8 bg-card border-border">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-foreground">
              نهاية الفصل {chapter.chapter_number}
            </h2>
            <p className="text-muted-foreground">
              هل استمتعت بهذا الفصل؟ تابع القراءة!
            </p>
            <div className="flex gap-4 justify-center">
              {hasPrevChapter && (
                <Button 
                  onClick={handlePrevChapter}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  الفصل السابق
                </Button>
              )}
              {hasNextChapter && (
                <Button 
                  onClick={handleNextChapter}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-manga-glow"
                >
                  الفصل التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Link to={`/manga/${mangaId}`}>
              <Button variant="ghost">
                العودة لصفحة المانجا
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent transition-all duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={handlePrevChapter}
              disabled={!hasPrevChapter}
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              <ChevronRight className="mr-2 h-4 w-4" />
              السابق
            </Button>

            <div className="text-white text-sm">
              {pages.length > 0 ? `${pages.length} صفحة` : 'لا توجد صفحات'}
            </div>

            <Button 
              onClick={handleNextChapter}
              disabled={!hasNextChapter}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              التالي
              <ChevronLeft className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
