import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowUp } from "lucide-react";

import { ReaderImage } from "@/components/reader/ReaderImage";
import { ReaderSettings } from "@/components/reader/ReaderSettings";
import { ReaderTopBar } from "@/components/reader/ReaderTopBar";
import { ReaderBottomBar } from "@/components/reader/ReaderBottomBar";
import { ChapterEndCard } from "@/components/reader/ChapterEndCard";

type ReadingMode = "vertical" | "single";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Reader = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  // Core state
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
  const [gapless, setGapless] = useState(false);

  // ─── Scroll progress tracking ───
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setReadingProgress(Math.round(latest * 100));
    setShowScrollTop(latest > 0.1);
    if (pages.length > 0) {
      setCurrentPage(Math.min(Math.floor(latest * pages.length), pages.length - 1));
    }
  });

  // ─── Auto-hide controls ───
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

  // ─── Keyboard navigation ───
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

  // ─── Navigation helpers ───
  const goToPrevPage = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(pages.length - 1, p + 1));

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

  // ─── User & Favorites ───
  useEffect(() => { checkUser(); }, [manga]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user && manga) checkFavorite(user.id);
  };

  const checkFavorite = async (userId: string) => {
    if (!manga) return;
    const { data } = await supabase
      .from("manga_favorites").select("id")
      .eq("user_id", userId).eq("manga_id", manga.id).maybeSingle();
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: "تسجيل الدخول مطلوب", description: "يجب تسجيل الدخول لإضافة مانجا للمفضلة", variant: "destructive" });
      return;
    }
    if (isFavorite) {
      await supabase.from("manga_favorites").delete().eq("user_id", user.id).eq("manga_id", manga.id);
      setIsFavorite(false);
      toast({ title: "تم الإزالة", description: "تم إزالة المانجا من المفضلة" });
    } else {
      await supabase.from("manga_favorites").insert({ user_id: user.id, manga_id: manga.id });
      setIsFavorite(true);
      toast({ title: "تمت الإضافة", description: "تمت إضافة المانجا للمفضلة" });
    }
  };

  const shareChapter = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${manga?.title} - الفصل ${chapter?.chapter_number}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم النسخ", description: "تم نسخ رابط الفصل" });
    }
  };

  // ─── Page fetching with "fast-then-full" strategy ───
  const fetchChapterPages = async (chapterDbId: string) => {
    const { data, error } = await supabase
      .from("chapter_pages").select("image_url")
      .eq("chapter_id", chapterDbId)
      .order("page_number", { ascending: true });
    if (error) throw error;
    return (data || []).map((p) => p.image_url).filter(Boolean);
  };

  const waitForChapterPages = async (
    chapterDbId: string,
    onPartialUpdate?: (urls: string[]) => void,
    opts?: { timeoutMs?: number; initialDelayMs?: number; minPages?: number }
  ) => {
    const timeoutMs = opts?.timeoutMs ?? 90_000;
    const initialDelayMs = opts?.initialDelayMs ?? 600;
    const minPagesForQuickShow = opts?.minPages ?? 8;
    const startedAt = Date.now();
    let delay = initialDelayMs;
    let lastCount = 0;
    let stableCount = 0;

    while (Date.now() - startedAt < timeoutMs) {
      const urls = await fetchChapterPages(chapterDbId);
      if (urls.length >= minPagesForQuickShow && onPartialUpdate) {
        onPartialUpdate(urls);
      }
      if (urls.length === lastCount && urls.length > 0) {
        stableCount++;
        if (stableCount >= 3) return urls;
      } else {
        stableCount = 0;
        lastCount = urls.length;
      }
      if (urls.length >= 30) delay = 3000;
      await sleep(delay);
      delay = Math.min(4000, Math.round(delay * 1.3));
    }
    return fetchChapterPages(chapterDbId);
  };

  const scrapeAndReloadPages = async (mangaData: any, chapterData: any) => {
    setRescraping(true);
    toast({ title: "جاري التحميل", description: "جاري تجهيز صور الفصل..." });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const invokePromise = supabase.functions.invoke("scrape-lekmanga", {
        body: {
          url: chapterData.source_url,
          jobType: "pages",
          chapterId: chapterData.id,
          source: mangaData.source,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      await sleep(800);

      let shownQuickMessage = false;
      const urls = await waitForChapterPages(chapterData.id, (partialUrls) => {
        setPages(partialUrls);
        if (!shownQuickMessage && partialUrls.length > 0) {
          toast({ title: "جاري التحميل", description: `${partialUrls.length} صفحة... المزيد قادم` });
          shownQuickMessage = true;
        }
      });

      const { error: invokeError } = await invokePromise;
      if (invokeError) console.warn("Scrape invoke warning:", invokeError);

      if (urls.length === 0) {
        throw new Error("لم يتم العثور على أي صور. جرّب إعادة التحميل بعد دقيقة.");
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

  // ─── Load chapter data ───
  useEffect(() => { loadChapterData(); }, [mangaId, chapterId]);

  const trackReadingProgress = async (mangaData: any, chapterData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingHistory } = await supabase
      .from("reading_history").select("id")
      .eq("user_id", user.id).eq("manga_id", mangaData.id).eq("chapter_id", chapterData.id)
      .maybeSingle();

    if (existingHistory) {
      await supabase.from("reading_history").update({ updated_at: new Date().toISOString() }).eq("id", existingHistory.id);
    } else {
      await supabase.from("reading_history").insert({ user_id: user.id, manga_id: mangaData.id, chapter_id: chapterData.id });
      await supabase.from("chapters").update({ views: (chapterData.views || 0) + 1 }).eq("id", chapterData.id);
      await supabase.from("manga").update({ views: (mangaData.views || 0) + 1 }).eq("id", mangaData.id);
    }
  };

  const loadChapterData = async () => {
    try {
      setLoading(true);
      setPages([]);
      setCurrentPage(0);

      const { data: mangaData, error: mangaError } = await supabase
        .from("manga").select("*").eq("slug", mangaId).single();
      if (mangaError || !mangaData) { navigate("/404"); return; }
      setManga(mangaData);

      const { data: chaptersData } = await supabase
        .from("chapters").select("*").eq("manga_id", mangaData.id)
        .order("chapter_number", { ascending: true });
      setAllChapters(chaptersData || []);

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters").select("*").eq("manga_id", mangaData.id)
        .eq("chapter_number", Number(chapterId)).single();
      if (chapterError || !chapterData) { navigate(`/manga/${mangaId}`); return; }
      setChapter(chapterData);

      await trackReadingProgress(mangaData, chapterData);

      const { data: pagesData } = await supabase
        .from("chapter_pages").select("*").eq("chapter_id", chapterData.id)
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

  // ─── Chapter navigation ───
  const handlePrevChapter = () => {
    const idx = allChapters.findIndex((c) => c.id === chapter?.id);
    if (idx > 0) navigate(`/read/${mangaId}/${allChapters[idx - 1].chapter_number}`);
  };

  const handleNextChapter = () => {
    const idx = allChapters.findIndex((c) => c.id === chapter?.id);
    if (idx < allChapters.length - 1) navigate(`/read/${mangaId}/${allChapters[idx + 1].chapter_number}`);
  };

  const handleChapterSelect = (value: string) => navigate(`/read/${mangaId}/${value}`);

  // ─── Loading state ───
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

  if (!manga || !chapter) return null;

  const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);
  const hasPrevChapter = currentIndex > 0;
  const hasNextChapter = currentIndex < allChapters.length - 1;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-black" : "bg-gray-100"}`}
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-[100]"
        initial={{ scaleX: 0 }}
        style={{ scaleX: readingProgress / 100, transformOrigin: "left" }}
      >
        <div className="h-full bg-gradient-to-r from-primary to-accent" />
      </motion.div>

      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <ReaderTopBar
            manga={manga}
            chapter={chapter}
            allChapters={allChapters}
            currentPage={currentPage}
            totalPages={pages.length}
            readingProgress={readingProgress}
            isFavorite={isFavorite}
            isFullscreen={isFullscreen}
            rescraping={rescraping}
            mangaSlug={mangaId!}
            onChapterSelect={handleChapterSelect}
            onToggleSettings={() => setShowSettings(!showSettings)}
            onRescrape={() => manga && chapter && scrapeAndReloadPages(manga, chapter)}
            onToggleFavorite={toggleFavorite}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <ReaderSettings
            readingMode={readingMode}
            brightness={brightness}
            zoom={zoom}
            isDarkMode={isDarkMode}
            gapless={gapless}
            onReadingModeChange={setReadingMode}
            onBrightnessChange={setBrightness}
            onZoomChange={setZoom}
            onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
            onGaplessToggle={() => setGapless(!gapless)}
            onReset={() => { setBrightness(100); setZoom(100); setReadingMode("vertical"); setGapless(false); }}
          />
        )}
      </AnimatePresence>

      {/* Reader Content */}
      <div
        ref={containerRef}
        className="h-screen overflow-auto"
        onClick={() => setShowControls(!showControls)}
      >
        {readingMode === "vertical" ? (
          <div className={`flex flex-col items-center py-20 ${gapless ? "" : "gap-1"}`}>
            <div
              className="w-full transition-all duration-300"
              style={{
                maxWidth: `${Math.min(zoom, 100)}%`,
                transform: zoom > 100 ? `scale(${zoom / 100})` : "none",
                transformOrigin: "top center",
              }}
            >
              {pages.length > 0 ? (
                pages.map((page, index) => (
                  <ReaderImage
                    key={`${page}-${index}`}
                    src={page}
                    alt={`الصفحة ${index + 1}`}
                    index={index}
                    isEager={index < 5}
                  />
                ))
              ) : (
                <div className="text-center py-20">
                  <p className={`text-xl ${isDarkMode ? "text-white/70" : "text-gray-600"}`}>
                    {rescraping ? "جاري سحب الصور..." : "لا توجد صفحات متاحة"}
                  </p>
                </div>
              )}
            </div>

            {/* End of chapter */}
            {pages.length > 0 && (
              <ChapterEndCard
                chapterNumber={chapter.chapter_number}
                mangaSlug={mangaId!}
                hasPrevChapter={hasPrevChapter}
                hasNextChapter={hasNextChapter}
                onPrevChapter={handlePrevChapter}
                onNextChapter={handleNextChapter}
              />
            )}
          </div>
        ) : (
          /* Single Page Mode */
          <div
            className="h-full flex items-center justify-center py-20 px-4"
            onClick={(e) => {
              e.stopPropagation();
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
                  className="max-h-[85vh] max-w-full object-contain select-none"
                  style={{ transform: `scale(${zoom / 100})` }}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="async"
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Scroll to Top */}
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
          <ReaderBottomBar
            readingMode={readingMode}
            readingProgress={readingProgress}
            currentPage={currentPage}
            totalPages={pages.length}
            hasPrevChapter={hasPrevChapter}
            hasNextChapter={hasNextChapter}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reader;
