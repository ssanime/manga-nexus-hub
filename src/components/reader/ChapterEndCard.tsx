import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

interface ChapterEndCardProps {
  chapterNumber: number;
  mangaSlug: string;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}

export const ChapterEndCard = ({
  chapterNumber,
  mangaSlug,
  hasPrevChapter,
  hasNextChapter,
  onPrevChapter,
  onNextChapter,
}: ChapterEndCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-2xl mx-auto px-4 pb-20"
    >
      <Card className="p-8 bg-card/90 backdrop-blur-md border-border text-center">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <BookOpen className="h-8 w-8 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          نهاية الفصل {chapterNumber}
        </h2>
        <p className="text-muted-foreground mb-6">
          هل استمتعت بهذا الفصل؟ تابع القراءة!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {hasPrevChapter && (
            <Button onClick={onPrevChapter} variant="outline" size="lg" className="gap-2">
              <ChevronRight className="h-5 w-5" />
              الفصل السابق
            </Button>
          )}
          {hasNextChapter && (
            <Button onClick={onNextChapter} size="lg" className="gap-2 shadow-lg shadow-primary/30">
              الفصل التالي
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        <Link to={`/manga/${mangaSlug}`}>
          <Button variant="ghost" className="mt-4">العودة لصفحة المانجا</Button>
        </Link>
      </Card>
    </motion.div>
  );
};
