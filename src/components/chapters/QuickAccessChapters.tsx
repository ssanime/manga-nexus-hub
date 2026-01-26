import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Play, BookMarked, CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
}

interface QuickAccessChaptersProps {
  chapters: Chapter[];
  mangaSlug: string;
  firstChapter: Chapter | null;
  latestChapter: Chapter | null;
  lastReadChapter: Chapter | null;
}

export const QuickAccessChapters = ({
  chapters,
  mangaSlug,
  firstChapter,
  latestChapter,
  lastReadChapter,
}: QuickAccessChaptersProps) => {
  const quickActions = [
    {
      key: "first",
      chapter: firstChapter,
      icon: Play,
      label: "ابدأ من البداية",
      gradient: "from-primary/30 to-primary/10",
      border: "border-primary/40",
      iconBg: "bg-primary/30",
      iconColor: "text-primary",
    },
    {
      key: "continue",
      chapter: lastReadChapter,
      icon: BookMarked,
      label: "أكمل القراءة",
      gradient: "from-accent/30 to-accent/10",
      border: "border-accent/40",
      iconBg: "bg-accent/30",
      iconColor: "text-accent",
      hide: !lastReadChapter || lastReadChapter.chapter_number === latestChapter?.chapter_number,
    },
    {
      key: "latest",
      chapter: latestChapter,
      icon: Sparkles,
      label: "آخر فصل",
      gradient: "from-green-500/30 to-green-500/10",
      border: "border-green-500/40",
      iconBg: "bg-green-500/30",
      iconColor: "text-green-500",
    },
  ].filter((action) => action.chapter && !action.hide);

  if (quickActions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {quickActions.map((action, index) => (
        <motion.div
          key={action.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link to={`/read/${mangaSlug}/${action.chapter!.chapter_number}`}>
            <Card
              className={`group cursor-pointer overflow-hidden border-2 ${action.border} bg-gradient-to-br ${action.gradient} p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-xl ${action.iconBg} p-3 transition-transform duration-300 group-hover:scale-110`}
                >
                  <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{action.label}</p>
                  <p className="truncate text-lg font-bold text-foreground">
                    الفصل {action.chapter!.chapter_number}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};
