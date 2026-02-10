import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, BookOpen, RefreshCw, ImageIcon, Eye, Flame, Sparkles, ArrowLeft } from "lucide-react";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export const LatestChaptersGrid = () => {
  const [chapters, setChapters] = useState<ChapterWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    const { data: chaptersData } = await supabase
      .from("chapters")
      .select(`
        id, chapter_number, title, created_at, views,
        manga:manga_id (id, slug, title, cover_url, genres)
      `)
      .order("created_at", { ascending: false })
      .limit(24);

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

    const enriched = chaptersData.map((ch: any) => ({
      ...ch,
      first_page_url: pageMap.get(ch.id)?.first_url || null,
      page_count: pageMap.get(ch.id)?.count || 0,
    }));

    setChapters(enriched);
    setLoading(false);
    setRefreshing(false);
  }, []);

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

  if (loading) {
    return (
      <section className="py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            آخر الفصول
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
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
      </section>
    );
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={containerVariants}
      className="py-10"
    >
      {/* Header */}
      <motion.div
        variants={cardVariants}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/10"
          >
            <Clock className="h-6 w-6 text-primary" />
          </motion.div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_3s_ease-in-out_infinite]">
              آخر الفصول
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{chapters.length} فصل محدّث</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full hover:bg-primary/10"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Link to="/recent">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/20 hover:bg-primary/10 hover:border-primary/40">
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Cards Grid */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {chapters.map((chapter, index) => (
          <motion.div
            key={chapter.id}
            variants={cardVariants}
            onHoverStart={() => setHoveredId(chapter.id)}
            onHoverEnd={() => setHoveredId(null)}
            className="group relative"
          >
            <Link
              to={`/read/${chapter.manga?.slug || chapter.manga?.id}/${chapter.chapter_number}`}
              className={cn(
                "relative flex gap-4 p-4 rounded-2xl overflow-hidden",
                "bg-card/60 backdrop-blur-sm",
                "border border-border/30",
                "hover:border-primary/40 hover:bg-card/80",
                "transition-all duration-500 ease-out",
                "hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)]",
              )}
            >
              {/* Animated background glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 blur-xl" />
              </div>

              {/* Rank indicator for top 3 */}
              {index < 3 && (
                <div className="absolute top-2 left-2 z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1, type: "spring" }}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30",
                      index === 1 && "bg-gradient-to-br from-gray-300 to-gray-400 text-black shadow-lg shadow-gray-400/30",
                      index === 2 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30",
                    )}
                  >
                    {index + 1}
                  </motion.div>
                </div>
              )}

              {/* Cover Image */}
              <div className="relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 border border-border/20">
                <motion.img
                  src={chapter.first_page_url || chapter.manga?.cover_url || "/placeholder.svg"}
                  alt={chapter.manga?.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  animate={hoveredId === chapter.id ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Page count badge */}
                {chapter.page_count > 0 ? (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                    <ImageIcon className="h-2.5 w-2.5 text-primary" />
                    <span className="text-[10px] text-white font-semibold">{chapter.page_count}</span>
                  </div>
                ) : (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-yellow-500/20 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-yellow-500/30">
                    <Sparkles className="h-2.5 w-2.5 text-yellow-400" />
                    <span className="text-[10px] text-yellow-300 font-medium">جديد</span>
                  </div>
                )}

                {/* Chapter number overlay */}
                <div className="absolute top-1.5 right-1.5 bg-primary/90 backdrop-blur-sm rounded-lg px-2 py-0.5 shadow-lg shadow-primary/20">
                  <span className="text-[11px] text-primary-foreground font-bold">
                    {chapter.chapter_number}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10 py-0.5">
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300 truncate text-sm leading-tight">
                    {chapter.manga?.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      <BookOpen className="h-2.5 w-2.5 ml-1" />
                      الفصل {chapter.chapter_number}
                    </Badge>
                    {chapter.title && (
                      <span className="text-xs text-muted-foreground truncate">
                        {chapter.title}
                      </span>
                    )}
                  </div>

                  {/* Genre chips */}
                  {chapter.manga?.genres && chapter.manga.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {chapter.manga.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground border border-border/30"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom row: time + views */}
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

              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute top-0 -left-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:translate-x-[300%] transition-transform duration-1000" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};
