import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChapterCard } from "./ChapterCard";
import { QuickAccessChapters } from "./QuickAccessChapters";
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  views: number | null;
  release_date: string | null;
  created_at: string;
}

interface ChapterListNewProps {
  chapters: Chapter[];
  mangaSlug: string;
  mangaId: string;
  mangaCover?: string;
}

export const ChapterListNew = ({
  chapters,
  mangaSlug,
  mangaId,
  mangaCover,
}: ChapterListNewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [readChapterIds, setReadChapterIds] = useState<Set<string>>(new Set());
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const INITIAL_DISPLAY = 15;

  // Check for user and fetch reading history
  useEffect(() => {
    const fetchUserAndHistory = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user && mangaId) {
        const { data } = await supabase
          .from("reading_history")
          .select("chapter_id, updated_at")
          .eq("user_id", user.id)
          .eq("manga_id", mangaId)
          .order("updated_at", { ascending: false });

        if (data && data.length > 0) {
          const readIds = new Set(data.map((r) => r.chapter_id));
          setReadChapterIds(readIds);
          setLastReadChapterId(data[0].chapter_id);
        }
      }
    };

    fetchUserAndHistory();
  }, [mangaId]);

  // Sort and filter chapters
  const processedChapters = useMemo(() => {
    let result = [...chapters];

    // Sort
    result.sort((a, b) =>
      sortAsc
        ? a.chapter_number - b.chapter_number
        : b.chapter_number - a.chapter_number
    );

    // Filter
    if (searchQuery) {
      const searchNum = parseFloat(searchQuery);
      result = result.filter((chapter) => {
        if (!isNaN(searchNum)) {
          return chapter.chapter_number === searchNum;
        }
        return chapter.title?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    return result;
  }, [chapters, searchQuery, sortAsc]);

  // Get special chapters
  const firstChapter =
    chapters.length > 0
      ? chapters.reduce((min, c) =>
          c.chapter_number < min.chapter_number ? c : min
        )
      : null;

  const latestChapter =
    chapters.length > 0
      ? chapters.reduce((max, c) =>
          c.chapter_number > max.chapter_number ? c : max
        )
      : null;

  const lastReadChapter = lastReadChapterId
    ? chapters.find((c) => c.id === lastReadChapterId) || null
    : null;

  // Display chapters
  const displayedChapters = showAll
    ? processedChapters
    : processedChapters.slice(0, INITIAL_DISPLAY);

  if (chapters.length === 0) {
    return (
      <Card className="border-border bg-card/50 p-8 text-center backdrop-blur-sm">
        <BookOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">لا توجد فصول متاحة حالياً</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access */}
      <QuickAccessChapters
        chapters={chapters}
        mangaSlug={mangaSlug}
        firstChapter={firstChapter}
        latestChapter={latestChapter}
        lastReadChapter={lastReadChapter}
      />

      {/* Header with Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        {/* Search */}
        {chapters.length > 10 && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن فصل برقمه أو عنوانه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border/50 bg-card/50 pr-10 backdrop-blur-sm"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortAsc(!sortAsc)}
            className="gap-2"
          >
            {sortAsc ? (
              <>
                <SortAsc className="h-4 w-4" />
                تصاعدي
              </>
            ) : (
              <>
                <SortDesc className="h-4 w-4" />
                تنازلي
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="gap-2"
          >
            {viewMode === "list" ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Chapters Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          عرض {displayedChapters.length} من {processedChapters.length} فصل
        </span>
        {readChapterIds.size > 0 && (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            قرأت {readChapterIds.size} فصل
          </span>
        )}
      </div>

      {/* Chapters Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-2"
          }
        >
          {displayedChapters.map((chapter, index) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              mangaSlug={mangaSlug}
              mangaCover={mangaCover}
              isRead={readChapterIds.has(chapter.id)}
              isLatest={latestChapter?.chapter_number === chapter.chapter_number}
              isLastRead={lastReadChapterId === chapter.id}
              index={index}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Show More/Less */}
      {processedChapters.length > INITIAL_DISPLAY && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center pt-4"
        >
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="gap-2 rounded-full px-6"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                عرض أقل
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                عرض الكل ({processedChapters.length - INITIAL_DISPLAY} فصل إضافي)
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* No Results */}
      {processedChapters.length === 0 && searchQuery && (
        <Card className="border-border bg-card/50 p-8 text-center backdrop-blur-sm">
          <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            لا توجد نتائج للبحث "{searchQuery}"
          </p>
        </Card>
      )}
    </div>
  );
};
