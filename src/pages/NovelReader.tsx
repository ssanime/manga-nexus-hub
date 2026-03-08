import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUp, ChevronLeft, ChevronRight, BookOpen, Settings, Heart, Maximize, Minimize,
  Home, List, Sun, Moon, Type, Minus, Plus,
} from "lucide-react";

const NovelReader = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  const [loading, setLoading] = useState(true);
  const [novel, setNovel] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [rescraping, setRescraping] = useState(false);

  // Settings
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [brightness, setBrightness] = useState(100);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setReadingProgress(Math.round(latest * 100));
    setShowScrollTop(latest > 0.1);
  });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => { window.removeEventListener("mousemove", handleMouseMove); clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSettings(false);
      if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const scrollToTop = () => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  useEffect(() => { checkUser(); }, [novel]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user && novel) {
      const { data } = await supabase.from("manga_favorites").select("id").eq("user_id", user.id).eq("manga_id", novel.id).maybeSingle();
      setIsFavorite(!!data);
    }
  };

  const toggleFavorite = async () => {
    if (!user) { toast({ title: "تسجيل الدخول مطلوب", variant: "destructive" }); return; }
    if (isFavorite) {
      await supabase.from("manga_favorites").delete().eq("user_id", user.id).eq("manga_id", novel.id);
      setIsFavorite(false);
    } else {
      await supabase.from("manga_favorites").insert({ user_id: user.id, manga_id: novel.id });
      setIsFavorite(true);
    }
  };

  useEffect(() => { loadChapterData(); }, [mangaId, chapterId]);

  const loadChapterData = async () => {
    try {
      setLoading(true);
      setPages([]);

      const { data: novelData, error: novelError } = await supabase
        .from("manga").select("*").eq("slug", mangaId).single();
      if (novelError || !novelData) { navigate("/404"); return; }
      setNovel(novelData);

      const { data: chaptersData } = await supabase
        .from("chapters").select("*").eq("manga_id", novelData.id)
        .order("chapter_number", { ascending: true });
      setAllChapters(chaptersData || []);

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters").select("*").eq("manga_id", novelData.id)
        .eq("chapter_number", Number(chapterId)).single();
      if (chapterError || !chapterData) { navigate(`/novel/${mangaId}`); return; }
      setChapter(chapterData);

      // Track reading
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase.from("reading_history").select("id")
          .eq("user_id", user.id).eq("manga_id", novelData.id).eq("chapter_id", chapterData.id).maybeSingle();
        if (existing) {
          await supabase.from("reading_history").update({ updated_at: new Date().toISOString() }).eq("id", existing.id);
        } else {
          await supabase.from("reading_history").insert({ user_id: user.id, manga_id: novelData.id, chapter_id: chapterData.id });
        }
      }

      // Load pages (images for novel chapters)
      const { data: pagesData } = await supabase
        .from("chapter_pages").select("*").eq("chapter_id", chapterData.id)
        .order("page_number", { ascending: true });
      setPages((pagesData || []).map(p => p.image_url));
    } finally {
      setLoading(false);
    }
  };

  const handlePrevChapter = () => {
    const idx = allChapters.findIndex(c => c.id === chapter?.id);
    if (idx > 0) navigate(`/read-novel/${mangaId}/${allChapters[idx - 1].chapter_number}`);
  };

  const handleNextChapter = () => {
    const idx = allChapters.findIndex(c => c.id === chapter?.id);
    if (idx < allChapters.length - 1) navigate(`/read-novel/${mangaId}/${allChapters[idx + 1].chapter_number}`);
  };

  const handleChapterSelect = (value: string) => navigate(`/read-novel/${mangaId}/${value}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل الفصل...</p>
        </motion.div>
      </div>
    );
  }

  if (!novel || !chapter) return null;

  const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
  const hasPrevChapter = currentIndex > 0;
  const hasNextChapter = currentIndex < allChapters.length - 1;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#1a1a2e]" : "bg-[#f5f0e8]"}`}
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-[100]"
        initial={{ scaleX: 0 }} style={{ scaleX: readingProgress / 100, transformOrigin: "left" }}
      >
        <div className="h-full bg-gradient-to-r from-primary to-accent" />
      </motion.div>

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <div className="bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link to={`/novel/${mangaId}`}>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><List className="h-5 w-5" /></Button>
                    </Link>
                    <div className="hidden sm:block">
                      <p className="text-white font-medium text-sm truncate max-w-[200px]">{novel.title}</p>
                      <p className="text-white/60 text-xs">الفصل {chapter.chapter_number}</p>
                    </div>
                  </div>

                  <Select value={String(chapter.chapter_number)} onValueChange={handleChapterSelect}>
                    <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allChapters.map(ch => (
                        <SelectItem key={ch.id} value={String(ch.chapter_number)}>
                          الفصل {ch.chapter_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setShowSettings(!showSettings)}>
                      <Settings className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleFavorite}>
                      <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleFullscreen}>
                      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }}
            className="fixed top-16 left-4 z-50 w-72 p-5 rounded-2xl bg-card border border-border/50 shadow-2xl"
          >
            <h3 className="text-foreground font-bold mb-4">إعدادات القراءة</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">حجم الخط</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.max(12, f - 2))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-foreground font-mono min-w-[40px] text-center">{fontSize}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.min(32, f + 2))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">السطوع</label>
                <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-primary" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الوضع الداكن</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsDarkMode(!isDarkMode)}>
                  {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Content */}
      <div ref={containerRef} className="h-screen overflow-auto" onClick={() => setShowControls(!showControls)}>
        <div className="flex flex-col items-center py-20">
          <div className="w-full max-w-3xl px-4 md:px-8">
            {/* Chapter Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 pt-8">
              <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-foreground"}`}>
                الفصل {chapter.chapter_number}
              </h2>
              {chapter.title && (
                <p className={`text-lg ${isDarkMode ? "text-white/60" : "text-muted-foreground"}`}>{chapter.title}</p>
              )}
              <div className={`w-24 h-0.5 mx-auto mt-4 ${isDarkMode ? "bg-white/20" : "bg-border"}`} />
            </motion.div>

            {/* Pages as images (same as manga reader for now) */}
            {pages.length > 0 ? (
              pages.map((page, index) => (
                <motion.img
                  key={`${page}-${index}`}
                  src={page}
                  alt={`الصفحة ${index + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-full h-auto mb-1 select-none"
                  loading={index < 5 ? "eager" : "lazy"}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              ))
            ) : (
              <div className="text-center py-20">
                <p className={`text-xl ${isDarkMode ? "text-white/70" : "text-muted-foreground"}`}>
                  لا توجد صفحات متاحة لهذا الفصل
                </p>
              </div>
            )}

            {/* Chapter End Navigation */}
            {pages.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="mt-12 mb-20 p-6 rounded-2xl bg-card border border-border/50 text-center"
              >
                <p className="text-muted-foreground mb-4">انتهى الفصل {chapter.chapter_number}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={handlePrevChapter} disabled={!hasPrevChapter} variant="outline" className="gap-2">
                    <ChevronRight className="h-4 w-4" />
                    الفصل السابق
                  </Button>
                  <Link to={`/novel/${mangaId}`}>
                    <Button variant="secondary" className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      قائمة الفصول
                    </Button>
                  </Link>
                  <Button onClick={handleNextChapter} disabled={!hasNextChapter} className="gap-2">
                    الفصل التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Button onClick={handlePrevChapter} disabled={!hasPrevChapter} variant="outline" size="sm"
                    className="text-white border-white/20 hover:bg-white/10 disabled:opacity-30 rounded-full gap-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="hidden sm:inline">السابق</span>
                  </Button>

                  <div className="flex-1 max-w-sm hidden sm:block">
                    <div className="text-white/50 text-center text-xs mb-1">{readingProgress}% مكتمل</div>
                    <div className="h-1 bg-white/15 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{ width: `${readingProgress}%` }} transition={{ duration: 0.2 }} />
                    </div>
                  </div>

                  <Button onClick={handleNextChapter} disabled={!hasNextChapter} size="sm"
                    className="bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-full gap-1.5"
                  >
                    <span className="hidden sm:inline">التالي</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-20 left-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NovelReader;
