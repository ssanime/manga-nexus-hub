import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, BookOpen, RefreshCw, ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ChapterWithPreview {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string;
  };
  first_page_url: string | null;
  page_count: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export const LatestChaptersGrid = () => {
  const [chapters, setChapters] = useState<ChapterWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChapters = async () => {
    // Get latest chapters with manga info
    const { data: chaptersData } = await supabase
      .from("chapters")
      .select(`
        id,
        chapter_number,
        title,
        created_at,
        manga:manga_id (
          id,
          slug,
          title,
          cover_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!chaptersData) {
      setLoading(false);
      return;
    }

    // Get first page for each chapter
    const chapterIds = chaptersData.map(c => c.id);
    const { data: pagesData } = await supabase
      .from("chapter_pages")
      .select("chapter_id, image_url, page_number")
      .in("chapter_id", chapterIds)
      .order("page_number", { ascending: true });

    // Create a map of chapter_id -> first page and count
    const pageMap = new Map<string, { first_url: string; count: number }>();
    pagesData?.forEach(page => {
      const existing = pageMap.get(page.chapter_id);
      if (!existing) {
        pageMap.set(page.chapter_id, { first_url: page.image_url, count: 1 });
      } else {
        existing.count++;
      }
    });

    const enrichedChapters = chaptersData.map((ch: any) => ({
      ...ch,
      first_page_url: pageMap.get(ch.id)?.first_url || null,
      page_count: pageMap.get(ch.id)?.count || 0,
    }));

    setChapters(enrichedChapters);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchChapters();
  }, []);

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

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            آخر الفصول
          </h2>
        </div>
        <div className="grid gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-card/50">
              <Skeleton className="w-14 h-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
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
      className="py-8"
    >
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20"
          >
            <Clock className="h-6 w-6 text-primary" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            آخر الفصول
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Link
            to="/recent"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            عرض الكل
            <span className="text-lg">←</span>
          </Link>
        </div>
      </motion.div>

      <motion.div className="grid gap-3">
        {chapters.map((chapter, index) => (
          <motion.div
            key={chapter.id}
            variants={itemVariants}
            whileHover={{ x: -8, scale: 1.01 }}
            className="group"
          >
            <Link
              to={`/read/${chapter.manga?.slug}/${chapter.chapter_number}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300"
            >
              {/* Cover with Chapter Preview */}
              <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0">
                {/* Show first page if available, otherwise manga cover */}
                <img
                  src={chapter.first_page_url || chapter.manga?.cover_url || "/placeholder.svg"}
                  alt={chapter.manga?.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Page count badge */}
                {chapter.page_count > 0 && (
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/70 rounded px-1 py-0.5">
                    <ImageIcon className="h-2.5 w-2.5 text-white" />
                    <span className="text-[10px] text-white font-medium">{chapter.page_count}</span>
                  </div>
                )}
                
                {/* Chapter number overlay */}
                <div className="absolute top-1 right-1 bg-primary/90 rounded px-1.5 py-0.5">
                  <span className="text-[10px] text-primary-foreground font-bold">
                    {chapter.chapter_number}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {chapter.manga?.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 rounded-full text-xs text-primary">
                    <BookOpen className="h-3 w-3" />
                    الفصل {chapter.chapter_number}
                  </span>
                  {chapter.title && (
                    <span className="text-sm text-muted-foreground truncate">
                      {chapter.title}
                    </span>
                  )}
                </div>
                {chapter.page_count === 0 && (
                  <span className="text-xs text-yellow-500 mt-1 inline-block">
                    ⏳ الصفحات ستُحمّل عند القراءة
                  </span>
                )}
              </div>

              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="h-3 w-3" />
                {formatTime(chapter.created_at)}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};
