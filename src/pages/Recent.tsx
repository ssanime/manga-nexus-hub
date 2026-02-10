import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Clock, BookOpen, Eye, ImageIcon, Sparkles, RefreshCw, Filter,
  ArrowUpDown, ChevronDown, Flame, TrendingUp,
} from "lucide-react";

interface ChapterItem {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  views: number;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string;
    genres: string[];
  };
  first_page_url: string | null;
  page_count: number;
}

type SortMode = "latest" | "views" | "pages";

const Recent = () => {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [visibleCount, setVisibleCount] = useState(30);
  const [total, setTotal] = useState(0);

  const fetchChapters = useCallback(async () => {
    const orderCol = sortMode === "views" ? "views" : "created_at";
    
    const { data: chaptersData, count } = await supabase
      .from("chapters")
      .select(`
        id, chapter_number, title, created_at, views,
        manga:manga_id (id, slug, title, cover_url, genres)
      `, { count: "exact" })
      .order(orderCol, { ascending: false })
      .limit(visibleCount);

    if (count) setTotal(count);
    if (!chaptersData) { setLoading(false); return; }

    const chapterIds = chaptersData.map(c => c.id);
    const { data: pagesData } = await supabase
      .from("chapter_pages")
      .select("chapter_id, image_url, page_number")
      .in("chapter_id", chapterIds)
      .order("page_number", { ascending: true });

    const pageMap = new Map<string, { first_url: string; count: number }>();
    pagesData?.forEach(page => {
      const existing = pageMap.get(page.chapter_id);
      if (!existing) {
        pageMap.set(page.chapter_id, { first_url: page.image_url, count: 1 });
      } else {
        existing.count++;
      }
    });

    let enriched: ChapterItem[] = chaptersData.map((ch: any) => ({
      ...ch,
      first_page_url: pageMap.get(ch.id)?.first_url || null,
      page_count: pageMap.get(ch.id)?.count || 0,
    }));

    if (sortMode === "pages") {
      enriched.sort((a, b) => b.page_count - a.page_count);
    }

    setChapters(enriched);
    setLoading(false);
    setRefreshing(false);
  }, [sortMode, visibleCount]);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChapters();
  };

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return "منذ فترة";
    }
  };

  const getTimeColor = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return "text-green-400";
    if (hours < 6) return "text-emerald-400";
    if (hours < 24) return "text-yellow-400";
    return "text-muted-foreground";
  };

  const sortOptions: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: "latest", label: "الأحدث", icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "views", label: "الأكثر مشاهدة", icon: <Flame className="h-3.5 w-3.5" /> },
    { key: "pages", label: "الأكثر صفحات", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  آخر الفصول المحدّثة
                </h1>
              </div>
              <p className="text-muted-foreground">
                {total > 0 ? `${total.toLocaleString()} فصل متاح` : "جاري التحميل..."}
              </p>
            </div>

            {/* Sort + Refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              {sortOptions.map((opt) => (
                <Button
                  key={opt.key}
                  variant={sortMode === opt.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortMode(opt.key)}
                  className={cn(
                    "gap-1.5 rounded-full transition-all",
                    sortMode === opt.key
                      ? "shadow-lg shadow-primary/20"
                      : "border-border/40 hover:border-primary/40"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-full"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card/60 border border-border/30">
                <Skeleton className="w-20 h-28 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">لا توجد فصول حالياً</p>
          </div>
        ) : (
          <>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
              }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {chapters.map((chapter, index) => (
                  <motion.div
                    key={chapter.id}
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.97 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
                    }}
                    layout
                    className="group"
                  >
                    <Link
                      to={`/read/${chapter.manga?.slug || chapter.manga?.id}/${chapter.chapter_number}`}
                      className={cn(
                        "relative flex gap-4 p-4 rounded-2xl overflow-hidden",
                        "bg-card/60 backdrop-blur-sm border border-border/30",
                        "hover:border-primary/40 hover:bg-card/80",
                        "transition-all duration-500 ease-out",
                        "hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)]",
                      )}
                    >
                      {/* Glow */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 blur-xl" />
                      </div>

                      {/* Rank for top 3 */}
                      {index < 3 && sortMode !== "latest" && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30",
                            index === 1 && "bg-gradient-to-br from-gray-300 to-gray-400 text-black",
                            index === 2 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
                          )}>
                            {index + 1}
                          </div>
                        </div>
                      )}

                      {/* Cover */}
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 border border-border/20">
                        <img
                          src={chapter.first_page_url || chapter.manga?.cover_url || "/placeholder.svg"}
                          alt={chapter.manga?.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        
                        {chapter.page_count > 0 ? (
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                            <ImageIcon className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[10px] text-white font-semibold">{chapter.page_count}</span>
                          </div>
                        ) : (
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-yellow-500/20 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-yellow-500/30">
                            <Sparkles className="h-2.5 w-2.5 text-yellow-400" />
                          </div>
                        )}

                        <div className="absolute top-1.5 right-1.5 bg-primary/90 backdrop-blur-sm rounded-lg px-2 py-0.5">
                          <span className="text-[11px] text-primary-foreground font-bold">{chapter.chapter_number}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10 py-0.5">
                        <div>
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-sm">
                            {chapter.manga?.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                              <BookOpen className="h-2.5 w-2.5 ml-1" />
                              الفصل {chapter.chapter_number}
                            </Badge>
                            {chapter.title && (
                              <span className="text-xs text-muted-foreground truncate">{chapter.title}</span>
                            )}
                          </div>
                          {chapter.manga?.genres && chapter.manga.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {chapter.manga.genres.slice(0, 3).map((genre) => (
                                <span key={genre} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground border border-border/30">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-1.5">
                          <div className={cn("flex items-center gap-1 text-[11px] font-medium", getTimeColor(chapter.created_at))}>
                            <Clock className="h-3 w-3" />
                            {formatTime(chapter.created_at)}
                          </div>
                          {(chapter.views || 0) > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {(chapter.views || 0).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shine */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                        <div className="absolute top-0 -left-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:translate-x-[300%] transition-transform duration-1000" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Load More */}
            {visibleCount < total && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mt-10"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount(prev => prev + 30)}
                  className="gap-2 rounded-full border-primary/20 hover:border-primary/50 hover:bg-primary/5 px-8"
                >
                  <ChevronDown className="h-4 w-4" />
                  تحميل المزيد ({Math.min(total - visibleCount, 30)} فصل)
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Recent;
