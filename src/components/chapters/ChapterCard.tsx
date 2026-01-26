import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Eye, Clock, BookOpen, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface ChapterCardProps {
  chapter: {
    id: string;
    chapter_number: number;
    title: string | null;
    views: number | null;
    release_date: string | null;
    created_at: string;
  };
  mangaSlug: string;
  mangaCover?: string;
  isRead?: boolean;
  isLatest?: boolean;
  isLastRead?: boolean;
  index: number;
}

const formatViews = (views: number) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
};

const formatDate = (date: string | null) => {
  if (!date) return "غير محدد";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: false, locale: ar });
  } catch {
    return "غير محدد";
  }
};

export const ChapterCard = ({
  chapter,
  mangaSlug,
  mangaCover,
  isRead = false,
  isLatest = false,
  isLastRead = false,
  index,
}: ChapterCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
    >
      <Link
        to={`/read/${mangaSlug}/${chapter.chapter_number}`}
        className={`group flex w-full items-center justify-between rounded-xl border p-3 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 ${
          isLastRead
            ? "border-accent bg-accent/10 hover:bg-accent/20"
            : isLatest
            ? "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
            : isRead
            ? "border-border/50 bg-muted/30 hover:bg-muted/50"
            : "border-border bg-card hover:bg-secondary/50 hover:border-primary/30"
        }`}
      >
        {/* Thumbnail */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/50 sm:h-[70px] sm:w-[70px]">
          <div className="relative h-full w-full">
            {mangaCover ? (
              <img
                alt={`الفصل ${chapter.chapter_number}`}
                draggable="false"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={mangaCover}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {/* Read Overlay */}
            {isRead && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="rounded-full bg-red-500 p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Info */}
        <div className="ml-2 flex min-w-0 flex-1 flex-col pr-2 sm:pr-3">
          <div className="flex flex-row items-center gap-2">
            <span
              className={`text-sm font-bold transition-colors sm:text-base ${
                isRead
                  ? "text-muted-foreground"
                  : "text-foreground group-hover:text-primary"
              }`}
            >
              الفصل {chapter.chapter_number}
            </span>
            {isLastRead && (
              <Badge
                variant="secondary"
                className="bg-accent/20 text-accent text-xs"
              >
                آخر قراءة
              </Badge>
            )}
            {isLatest && !isLastRead && (
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-500 text-xs"
              >
                جديد
              </Badge>
            )}
          </div>
          {chapter.title && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {chapter.title}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(chapter.release_date || chapter.created_at)}
            </span>
          </div>
        </div>

        {/* Right Side - Views & Badge */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{formatViews(chapter.views || 0)}</span>
          </div>
          <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
            مجاني
          </span>
        </div>
      </Link>
    </motion.div>
  );
};
