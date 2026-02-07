import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReaderBottomBarProps {
  readingMode: "vertical" | "single";
  readingProgress: number;
  currentPage: number;
  totalPages: number;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export const ReaderBottomBar = ({
  readingMode,
  readingProgress,
  currentPage,
  totalPages,
  hasPrevChapter,
  hasNextChapter,
  onPrevChapter,
  onNextChapter,
  onPrevPage,
  onNextPage,
}: ReaderBottomBarProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={onPrevChapter}
              disabled={!hasPrevChapter}
              variant="outline"
              size="sm"
              className="text-white border-white/20 hover:bg-white/10 disabled:opacity-30 rounded-full gap-1.5"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="hidden sm:inline">السابق</span>
            </Button>

            {readingMode === "single" && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onPrevPage} disabled={currentPage === 0} className="text-white hover:bg-white/10 h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-white text-sm min-w-[70px] text-center font-mono">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button variant="ghost" size="icon" onClick={onNextPage} disabled={currentPage === totalPages - 1} className="text-white hover:bg-white/10 h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}

            {readingMode === "vertical" && (
              <div className="flex-1 max-w-sm hidden sm:block">
                <div className="text-white/50 text-center text-xs mb-1">
                  {readingProgress}% مكتمل
                </div>
                <div className="h-1 bg-white/15 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    style={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={onNextChapter}
              disabled={!hasNextChapter}
              size="sm"
              className="bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-full gap-1.5"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
