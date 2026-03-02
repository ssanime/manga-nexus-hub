import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, BookOpen, RefreshCw, ImageIcon, Eye, Sparkles, ArrowLeft, Layers, Flame, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChapterWithPreview {
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

type ViewMode = "grid" | "list" | "compact";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const MangaCardTilt = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-4, 4]);

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const LatestChaptersGrid = () => {
  const [chapters, setChapters] = useState<ChapterWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 24;

  const fetchChapters = useCallback(async () => {
    const { data: chaptersData } = await supabase
      .from("chapters")
      .select(`id, chapter_number, title, created_at, views, manga:manga_id (id, slug, title, cover_url, genres)`)
      .order("created_at", { ascending: false })
      .range(page * perPage, (page + 1) * perPage - 1);

    if (!chaptersData) { setLoading(false); return; }

    const chapterIds = chaptersData.map(c => c.id);
    const { data: pagesData } = await supabase
      .from("chapter_pages")
      .select("chapter_id, image_url, page_number")
      .in("chapter_id", chapterIds)
      .order("page_number", { ascending: true });

    const pageMap = new Map<string, { first_url: string; count: number }>();
    pagesData?.forEach(p => {
      const existing = pageMap.get(p.chapter_id);
      if (!existing) {
        pageMap.set(p.chapter_id, { first_url: p.image_url, count: 1 });
      } else {
        existing.count++;
      }
    });

    const enriched = chaptersData.map((ch: any) => ({
      ...ch,
      first_page_url: pageMap.get(ch.id)?.first_url || null,
      page_count: pageMap.get(ch.id)?.count || 0,
    }));

    setChapters(enriched);
    setLoading(false);
    setRefreshing(false);
  }, [page]);

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
    if (hours < 72) return "text-orange-400";
    return "text-muted-foreground";
  };

  const getTimeBadge = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return { text: "الآن", color: "from-green-500 to-emerald-600", icon: Flame };
    if (hours < 6) return { text: "حديث", color: "from-emerald-500 to-teal-600", icon: Sparkles };
    if (hours < 24) return { text: "اليوم", color: "from-yellow-500 to-amber-600", icon: Star };
    return null;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return "from-yellow-400 via-amber-400 to-yellow-500 shadow-yellow-500/40 text-black";
    if (index === 1) return "from-slate-300 via-gray-300 to-slate-400 shadow-gray-400/40 text-black";
    if (index === 2) return "from-amber-600 via-orange-600 to-amber-700 shadow-amber-600/40 text-white";
    return "";
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            آخر الفصول
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={containerVariants}
      className="py-12"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/10 shadow-lg shadow-primary/5"
          >
            <Clock className="h-6 w-6 text-primary" />
          </motion.div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient_3s_ease-in-out_infinite]">
                آخر الفصول
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {chapters.length} فصل • محدّث لحظياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode */}
          <div className="flex items-center bg-card/80 rounded-xl border border-border/40 p-1 gap-0.5">
            {(["grid", "list", "compact"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-all duration-200",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {mode === "grid" && <Layers className="h-3.5 w-3.5" />}
                {mode === "list" && <BookOpen className="h-3.5 w-3.5" />}
                {mode === "compact" && <ImageIcon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl hover:bg-primary/10 border border-border/30"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>

          <Link to="/recent">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 font-semibold">
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Grid View */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" && (
          <motion.div
            key="grid"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4"
          >
            {chapters.map((chapter, index) => {
              const timeBadge = getTimeBadge(chapter.created_at);
              return (
                <motion.div key={chapter.id} variants={cardVariants} layout>
                  <MangaCardTilt className="perspective-1000">
                    <Link
                      to={`/read/${chapter.manga?.slug || chapter.manga?.id}/${chapter.chapter_number}`}
                      className="group block"
                      onMouseEnter={() => setHoveredId(chapter.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/30 hover:border-primary/40 transition-all duration-500 shadow-md hover:shadow-xl hover:shadow-primary/10">
                        {/* Cover Image */}
                        <motion.img
                          src={chapter.first_page_url || chapter.manga?.cover_url || "/placeholder.svg"}
                          alt={chapter.manga?.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          animate={hoveredId === chapter.id ? { scale: 1.08 } : { scale: 1 }}
                          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />

                        {/* Multi-layer gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Animated shine sweep */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden">
                          <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1200ms] ease-out" />
                        </div>

                        {/* Top badges row */}
                        <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10">
                          {/* Rank badge */}
                          {index < 3 ? (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg bg-gradient-to-br",
                                getRankStyle(index)
                              )}
                            >
                              {index + 1}
                            </motion.div>
                          ) : (
                            <div />
                          )}

                          {/* Time badge */}
                          {timeBadge && (
                            <motion.div
                              initial={{ x: 20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              className={cn(
                                "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r shadow-lg",
                                timeBadge.color
                              )}
                            >
                              <timeBadge.icon className="h-2.5 w-2.5" />
                              {timeBadge.text}
                            </motion.div>
                          )}
                        </div>

                        {/* Chapter number pill */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                          <div className="bg-primary/90 backdrop-blur-md rounded-full px-3 py-1 shadow-lg shadow-primary/30">
                            <span className="text-[11px] text-primary-foreground font-bold">
                              الفصل {chapter.chapter_number}
                            </span>
                          </div>
                        </div>

                        {/* Bottom content */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                          {/* Page count / New badge */}
                          <div className="flex items-center gap-1.5 mb-2">
                            {chapter.page_count > 0 ? (
                              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg px-2 py-0.5 border border-white/10">
                                <Layers className="h-2.5 w-2.5 text-primary" />
                                <span className="text-[10px] text-white font-semibold">{chapter.page_count}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-primary/20 backdrop-blur-md rounded-lg px-2 py-0.5 border border-primary/30">
                                <Sparkles className="h-2.5 w-2.5 text-primary" />
                                <span className="text-[10px] text-primary font-bold">جديد</span>
                              </div>
                            )}
                            {(chapter.views || 0) > 0 && (
                              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg px-2 py-0.5 border border-white/10">
                                <Eye className="h-2.5 w-2.5 text-blue-400" />
                                <span className="text-[10px] text-white font-medium">{formatViews(chapter.views || 0)}</span>
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-lg group-hover:text-primary-foreground transition-colors">
                            {chapter.manga?.title}
                          </h3>

                          {/* Chapter info */}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11px] text-white/80 font-semibold">
                              الفصل {chapter.chapter_number}
                            </span>
                            <span className={cn("text-[10px] font-medium", getTimeColor(chapter.created_at))}>
                              {formatTime(chapter.created_at)}
                            </span>
                          </div>

                          {/* Genres - on hover */}
                          {chapter.manga?.genres && chapter.manga.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 max-h-0 group-hover:max-h-10 overflow-hidden transition-all duration-500">
                              {chapter.manga.genres.slice(0, 2).map((genre) => (
                                <span key={genre} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 backdrop-blur-sm border border-white/5">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover border glow */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-primary/40 transition-all duration-500 pointer-events-none" />
                      </div>
                    </Link>
                  </MangaCardTilt>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <motion.div
            key="list"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="space-y-2"
          >
            {chapters.map((chapter, index) => {
              const timeBadge = getTimeBadge(chapter.created_at);
              return (
                <motion.div key={chapter.id} variants={cardVariants} layout>
                  <Link
                    to={`/read/${chapter.manga?.slug || chapter.manga?.id}/${chapter.chapter_number}`}
                    className={cn(
                      "group relative flex gap-4 p-3 md:p-4 rounded-2xl overflow-hidden",
                      "bg-card/50 backdrop-blur-sm border border-border/30",
                      "hover:border-primary/40 hover:bg-card/80",
                      "transition-all duration-400",
                      "hover:shadow-[0_4px_30px_-8px_hsl(var(--primary)/0.2)]"
                    )}
                    onMouseEnter={() => setHoveredId(chapter.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 blur-xl" />
                    </div>

                    {/* Rank */}
                    {index < 3 && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg bg-gradient-to-br", getRankStyle(index))}>
                          {index + 1}
                        </div>
                      </div>
                    )}

                    {/* Cover */}
                    <div className="relative w-16 h-22 md:w-20 md:h-28 rounded-xl overflow-hidden flex-shrink-0 border border-border/20">
                      <motion.img
                        src={chapter.first_page_url || chapter.manga?.cover_url || "/placeholder.svg"}
                        alt={chapter.manga?.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        animate={hoveredId === chapter.id ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-1 right-1 bg-primary/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
                        <span className="text-[10px] text-primary-foreground font-bold">{chapter.chapter_number}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10 py-0.5">
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300 truncate text-sm">
                          {chapter.manga?.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                            <BookOpen className="h-2.5 w-2.5 ml-1" />
                            الفصل {chapter.chapter_number}
                          </Badge>
                          {timeBadge && (
                            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold text-white bg-gradient-to-r", timeBadge.color)}>
                              {timeBadge.text}
                            </span>
                          )}
                          {chapter.page_count > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Layers className="h-2.5 w-2.5" /> {chapter.page_count} صفحة
                            </span>
                          )}
                        </div>
                        {chapter.manga?.genres && chapter.manga.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            {chapter.manga.genres.slice(0, 3).map((genre) => (
                              <span key={genre} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground border border-border/30">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-1.5">
                        <span className={cn("flex items-center gap-1 text-[11px] font-medium", getTimeColor(chapter.created_at))}>
                          <Clock className="h-3 w-3" />
                          {formatTime(chapter.created_at)}
                        </span>
                        {(chapter.views || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {formatViews(chapter.views || 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shine */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden">
                      <div className="absolute top-0 -left-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:translate-x-[300%] transition-transform duration-1000" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Compact View */}
        {viewMode === "compact" && (
          <motion.div
            key="compact"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"
          >
            {chapters.map((chapter, index) => (
              <motion.div key={chapter.id} variants={cardVariants} layout>
                <Link
                  to={`/read/${chapter.manga?.slug || chapter.manga?.id}/${chapter.chapter_number}`}
                  className="group block"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card border border-border/30 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    <img
                      src={chapter.first_page_url || chapter.manga?.cover_url || "/placeholder.svg"}
                      alt={chapter.manga?.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                    
                    {/* Chapter badge */}
                    <div className="absolute top-1 right-1 bg-primary/90 rounded-md px-1.5 py-0.5">
                      <span className="text-[9px] text-primary-foreground font-bold">{chapter.chapter_number}</span>
                    </div>

                    {index < 3 && (
                      <div className="absolute top-1 left-1">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black bg-gradient-to-br shadow", getRankStyle(index))}>
                          {index + 1}
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-1.5">
                      <h3 className="text-[10px] font-bold text-white line-clamp-2 leading-tight">{chapter.manga?.title}</h3>
                      <span className={cn("text-[8px] mt-0.5 block", getTimeColor(chapter.created_at))}>
                        {formatTime(chapter.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      <motion.div variants={cardVariants} className="flex items-center justify-center gap-3 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded-xl gap-1 border-border/40"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </Button>
        <div className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                page === i
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={chapters.length < perPage}
          className="rounded-xl gap-1 border-border/40"
        >
          التالي
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.section>
  );
};
