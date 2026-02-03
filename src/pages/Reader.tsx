import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  List,
  X,
  Loader2,
  Heart,
  Share2,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowUp,
  BookOpen,
  Eye,
} from "lucide-react";

type ReadingMode = "vertical" | "single" | "double";

const Reader = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  // State
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manga, setManga] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [rescraping, setRescraping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Settings
  const [readingMode, setReadingMode] = useState<ReadingMode>("vertical");
  const [brightness, setBrightness] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Track scroll progress
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setReadingProgress(Math.round(latest * 100));
    setShowScrollTop(latest > 0.1);

    // Calculate current page
    if (pages.length > 0) {
      const pageIndex = Math.floor(latest * pages.length);
      setCurrentPage(Math.min(pageIndex, pages.length - 1));
    }
  });

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readingMode !== "vertical") {
        if (e.key === "ArrowLeft") goToNextPage();
        if (e.key === "ArrowRight") goToPrevPage();
      }
      if (e.key === "Escape") setShowSettings(false);
      if (e.key === "f") toggleFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readingMode, currentPage, pages.length]);

  const goToPrevPage = () => {
    if (currentPage > 0) setCurrentPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) setCurrentPage((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    checkUser();
  }, [manga]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user && manga) {
      checkFavorite(user.id);
    }
  };

  const checkFavorite = async (userId: string) => {
    if (!manga) return;
    const { data } = await supabase
      .from("manga_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("manga_id", manga.id)
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
      await supabase
        .from("manga_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("manga_id", manga.id);
      setIsFavorite(false);
      toast({ title: "تم الإزالة", description: "تم إزالة المانجا من المفضلة" });
    } else {
      await supabase
        .from("manga_favorites")
        .insert({ user_id: user.id, manga_id: manga.id });
      setIsFavorite(true);
      toast({ title: "تمت الإضافة", description: "تمت إضافة المانجا للمفضلة" });
    }
  };

  const shareChapter = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${manga?.title} - الفصل ${chapter?.chapter_number}`,
        text: `اقرأ ${manga?.title} الفصل ${chapter?.chapter_number} على Mangafas`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم النسخ", description: "تم نسخ رابط الفصل" });
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const fetchChapterPages = async (chapterDbId: string) => {
    const { data, error } = await supabase
      .from("chapter_pages")
      .select("image_url")
      .eq("chapter_id", chapterDbId)
      .order("page_number", { ascending: true });

    if (error) throw error;
    return (data || []).map((p) => p.image_url).filter(Boolean);
  };

  const waitForChapterPages = async (
    chapterDbId: string,
    opts?: { timeoutMs?: number; initialDelayMs?: number }
  ) => {
    const timeoutMs = opts?.timeoutMs ?? 60_000;
    const initialDelayMs = opts?.initialDelayMs ?? 800;

    const startedAt = Date.now();
    let delay = initialDelayMs;

    // Poll until we see at least 1 page or until timeout.
    while (Date.now() - startedAt < timeoutMs) {
      const urls = await fetchChapterPages(chapterDbId);
      if (urls.length > 0) return urls;
      await sleep(delay);
      delay = Math.min(4000, Math.round(delay * 1.4));
    }

    return [] as string[];
  };

  const scrapeAndReloadPages = async (mangaData: any, chapterData: any) => {
    setRescraping(true);
    toast({ title: "جاري التحميل", description: "جاري تجهيز صور الفصل..." });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { error: invokeError } = await supabase.functions.invoke("scrape-lekmanga", {
        body: {
          url: chapterData.source_url,
          jobType: "pages",
          chapterId: chapterData.id,
          source: mangaData.source,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (invokeError) {
        console.error("Scrape invoke error:", invokeError);
        throw new Error(invokeError.message || "فشل سحب صور الفصل");
      }

      // The backend may keep downloading/uploading images after the invoke returns.
      // We poll the DB so we don't show "0 صفحات" prematurely.
      const urls = await waitForChapterPages(chapterData.id);

      if (urls.length === 0) {
        throw new Error(
          "لم يتم العثور على أي صور بعد السحب. قد يكون الفصل محمي/الرابط تغيّر أو العملية ما زالت جارية—جرّب إعادة التحميل بعد دقيقة."
        );
      }

      setPages(urls);
      toast({ title: "تم", description: `تم تحميل ${urls.length} صفحة` });
    } catch (err) {
      console.error("Error scraping chapter pages:", err);
      toast({
        title: "خطأ",
        description: err instanceof Error ? err.message : "فشل سحب صفحات الفصل",
        variant: "destructive",
      });
    } finally {
      setRescraping(false);
    }
  };

  useEffect(() => {
    loadChapterData();
  }, [mangaId, chapterId]);

  const trackReadingProgress = async (mangaData: any, chapterData: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: existingHistory } = await supabase
        .from("reading_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("manga_id", mangaData.id)
        .eq("chapter_id", chapterData.id)
        .maybeSingle();

      if (existingHistory) {
        await supabase
          .from("reading_history")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", existingHistory.id);
      } else {
        await supabase.from("reading_history").insert({
          user_id: user.id,
          manga_id: mangaData.id,
          chapter_id: chapterData.id,
        });

        await supabase
          .from("chapters")
          .update({ views: (chapterData.views || 0) + 1 })
          .eq("id", chapterData.id);

        await supabase
          .from("manga")
          .update({ views: (mangaData.views || 0) + 1 })
          .eq("id", mangaData.id);
      }
    }
  };

  const loadChapterData = async () => {
    try {
      setLoading(true);

      const { data: mangaData, error: mangaError } = await supabase
        .from("manga")
        .select("*")
        .eq("slug", mangaId)
        .single();

      if (mangaError || !mangaData) {
        navigate("/404");
        return;
      }

      setManga(mangaData);

      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", mangaData.id)
        .order("chapter_number", { ascending: true });

      setAllChapters(chaptersData || []);

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", mangaData.id)
        .eq("chapter_number", Number(chapterId))
        .single();

      if (chapterError || !chapterData) {
        navigate(`/manga/${mangaId}`);
        return;
      }

      setChapter(chapterData);
      await trackReadingProgress(mangaData, chapterData);

      const { data: pagesData } = await supabase
        .from("chapter_pages")
        .select("*")
        .eq("chapter_id", chapterData.id)
        .order("page_number", { ascending: true });

      if (!pagesData || pagesData.length === 0) {
        await scrapeAndReloadPages(mangaData, chapterData);
      } else {
        setPages(pagesData.map((p) => p.image_url));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrevChapter = () => {
    const currentIndex = allChapters.findIndex((c) => c.id === chapter?.id);
    if (currentIndex > 0) {
      const prevChapter = allChapters[currentIndex - 1];
      navigate(`/read/${mangaId}/${prevChapter.chapter_number}`);
    }
  };

  const handleNextChapter = () => {
    const currentIndex = allChapters.findIndex((c) => c.id === chapter?.id);
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">جاري تحميل الفصل...</p>
        </motion.div>
      </div>
    );
  }

  if (!manga || !chapter) return null;

  const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);
  const hasPrevChapter = currentIndex > 0;
  const hasNextChapter = currentIndex < allChapters.length - 1;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-black" : "bg-gray-100"
      }`}
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary/30 z-[100]"
        initial={{ scaleX: 0 }}
        style={{ scaleX: readingProgress / 100, transformOrigin: "left" }}
      >
        <div className="h-full bg-gradient-to-r from-primary to-accent" />
      </motion.div>

      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <div className="bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-sm">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  {/* Left Side */}
                  <div className="flex items-center gap-4">
                    <Link to={`/manga/${mangaId}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10 rounded-full"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                    </Link>
                    <div className="hidden sm:block">
                      <h1 className="text-white font-bold text-lg line-clamp-1">
                        {manga.title}
                      </h1>
                      <p className="text-white/60 text-sm">
                        الفصل {chapter.chapter_number}
                        {chapter.title && ` - ${chapter.title}`}
                      </p>
                    </div>
                  </div>

                  {/* Center - Page Info */}
                  <div className="hidden md:flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2">
                    <span className="text-white/60 text-sm">
                      {currentPage + 1} / {pages.length}
                    </span>
                    <div className="w-px h-4 bg-white/20" />
                    <span className="text-white/60 text-sm">{readingProgress}%</span>
                  </div>

                  {/* Right Side */}
                  <div className="flex items-center gap-1">
                    <Select
                      value={String(chapter.chapter_number)}
                      onValueChange={handleChapterSelect}
                    >
                      <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white rounded-full">
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

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:bg-white/10 rounded-full"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>

                    <Link to={`/manga/${mangaId}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10 rounded-full"
                      >
                        <List className="h-5 w-5" />
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        manga && chapter && scrapeAndReloadPages(manga, chapter)
                      }
                      disabled={rescraping}
                      className="text-white hover:bg-white/10 rounded-full"
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
                      onClick={toggleFavorite}
                      className="text-white hover:bg-white/10 rounded-full"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isFavorite ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/10 rounded-full hidden md:flex"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-5 w-5" />
                      ) : (
                        <Maximize className="h-5 w-5" />
                      )}
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
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-20 left-4 z-50 w-72"
          >
            <Card className="p-6 bg-card/95 backdrop-blur-md border-border shadow-2xl">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات القراءة
              </h3>

              <div className="space-y-6">
                {/* Reading Mode */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    وضع القراءة
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "vertical", label: "عمودي" },
                      { value: "single", label: "صفحة" },
                    ].map((mode) => (
                      <Button
                        key={mode.value}
                        variant={readingMode === mode.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReadingMode(mode.value as ReadingMode)}
                        className="flex-1"
                      >
                        {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Brightness */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      السطوع
                    </span>
                    <span>{brightness}%</span>
                  </label>
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) => setBrightness(v)}
                    min={50}
                    max={150}
                    step={5}
                  />
                </div>

                {/* Zoom */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ZoomIn className="h-4 w-4" />
                      التكبير
                    </span>
                    <span>{zoom}%</span>
                  </label>
                  <Slider
                    value={[zoom]}
                    onValueChange={([v]) => setZoom(v)}
                    min={50}
                    max={200}
                    step={10}
                  />
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    الوضع الليلي
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    {isDarkMode ? "مفعّل" : "معطّل"}
                  </Button>
                </div>

                {/* Reset */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    setBrightness(100);
                    setZoom(100);
                    setReadingMode("vertical");
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  إعادة ضبط
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Content */}
      <div
        ref={containerRef}
        className="h-screen overflow-auto"
        onClick={() => setShowControls(!showControls)}
      >
        {readingMode === "vertical" ? (
          // Vertical Scroll Mode
          <div className="flex flex-col items-center py-20">
            <div
              className="w-full transition-all duration-300"
              style={{
                maxWidth: `${Math.min(zoom, 100)}%`,
                transform: zoom > 100 ? `scale(${zoom / 100})` : "none",
              }}
            >
              {pages.length > 0 ? (
                pages.map((page, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <img
                      src={page}
                      alt={`الصفحة ${index + 1}`}
                      className="w-full h-auto"
                      loading={index > 3 ? "lazy" : "eager"}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20">
                  <p className="text-white text-xl">لا توجد صفحات متاحة</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Single Page Mode
          <div
            className="h-full flex items-center justify-center py-20 px-4"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              if (clickX < rect.width / 3) goToNextPage();
              else if (clickX > (rect.width * 2) / 3) goToPrevPage();
              else setShowControls(!showControls);
            }}
          >
            <AnimatePresence mode="wait">
              {pages[currentPage] && (
                <motion.img
                  key={currentPage}
                  src={pages[currentPage]}
                  alt={`الصفحة ${currentPage + 1}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-[85vh] max-w-full object-contain"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* End of Chapter Card */}
        {readingMode === "vertical" && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto px-4 pb-20"
          >
            <Card className="p-8 bg-card/90 backdrop-blur-md border-border text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <BookOpen className="h-8 w-8 text-primary" />
              </motion.div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                نهاية الفصل {chapter.chapter_number}
              </h2>
              <p className="text-muted-foreground mb-6">
                هل استمتعت بهذا الفصل؟ تابع القراءة!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {hasPrevChapter && (
                  <Button
                    onClick={handlePrevChapter}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                    الفصل السابق
                  </Button>
                )}
                {hasNextChapter && (
                  <Button
                    onClick={handleNextChapter}
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/30"
                  >
                    الفصل التالي
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
              </div>

              <Link to={`/manga/${mangaId}`}>
                <Button variant="ghost" className="mt-4">
                  العودة لصفحة المانجا
                </Button>
              </Link>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 left-4 z-50 p-3 bg-primary rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowUp className="h-5 w-5 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <Button
                    onClick={handlePrevChapter}
                    disabled={!hasPrevChapter}
                    variant="outline"
                    className="text-white border-white/20 hover:bg-white/10 disabled:opacity-30 rounded-full gap-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                    <span className="hidden sm:inline">السابق</span>
                  </Button>

                  {/* Page Indicator for Single Mode */}
                  {readingMode === "single" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrevPage}
                        disabled={currentPage === 0}
                        className="text-white hover:bg-white/10"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                      <span className="text-white min-w-[80px] text-center">
                        {currentPage + 1} / {pages.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextPage}
                        disabled={currentPage === pages.length - 1}
                        className="text-white hover:bg-white/10"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </div>
                  )}

                  {/* Progress for Vertical Mode */}
                  {readingMode === "vertical" && (
                    <div className="flex-1 max-w-md hidden sm:block">
                      <div className="text-white/60 text-center text-sm mb-1">
                        {readingProgress}% مكتمل
                      </div>
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-accent"
                          style={{ width: `${readingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleNextChapter}
                    disabled={!hasNextChapter}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-full gap-2"
                  >
                    <span className="hidden sm:inline">التالي</span>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reader;
