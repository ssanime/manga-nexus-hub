import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X, List, Loader2, Heart, RefreshCw, Settings,
  Maximize, Minimize,
} from "lucide-react";

interface ReaderTopBarProps {
  manga: any;
  chapter: any;
  allChapters: any[];
  currentPage: number;
  totalPages: number;
  readingProgress: number;
  isFavorite: boolean;
  isFullscreen: boolean;
  rescraping: boolean;
  mangaSlug: string;
  onChapterSelect: (v: string) => void;
  onToggleSettings: () => void;
  onRescrape: () => void;
  onToggleFavorite: () => void;
  onToggleFullscreen: () => void;
}

export const ReaderTopBar = ({
  manga,
  chapter,
  allChapters,
  currentPage,
  totalPages,
  readingProgress,
  isFavorite,
  isFullscreen,
  rescraping,
  mangaSlug,
  onChapterSelect,
  onToggleSettings,
  onRescrape,
  onToggleFavorite,
  onToggleFullscreen,
}: ReaderTopBarProps) => {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-3">
              <Link to={`/manga/${mangaSlug}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </Link>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-base line-clamp-1">{manga.title}</h1>
                <p className="text-white/50 text-xs">
                  الفصل {chapter.chapter_number}
                  {chapter.title && ` - ${chapter.title}`}
                </p>
              </div>
            </div>

            {/* Center */}
            <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-1.5">
              <span className="text-white/60 text-xs font-mono">
                {currentPage + 1} / {totalPages}
              </span>
              <div className="w-px h-3.5 bg-white/20" />
              <span className="text-white/60 text-xs">{readingProgress}%</span>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-0.5">
              <Select value={String(chapter.chapter_number)} onValueChange={onChapterSelect}>
                <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white rounded-full text-xs h-8">
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

              <Button variant="ghost" size="icon" onClick={onToggleSettings} className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>

              <Link to={`/manga/${mangaSlug}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                  <List className="h-4 w-4" />
                </Button>
              </Link>

              <Button
                variant="ghost" size="icon"
                onClick={onRescrape}
                disabled={rescraping}
                className="text-white hover:bg-white/10 rounded-full h-8 w-8"
              >
                {rescraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={onToggleFavorite} className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>

              <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className="text-white hover:bg-white/10 rounded-full h-8 w-8 hidden md:flex">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
