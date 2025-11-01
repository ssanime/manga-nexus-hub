import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Clock, BookOpen } from "lucide-react";
import { Badge } from "./ui/badge";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  release_date: string | null;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string;
  };
}

export const LatestChapters = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    fetchLatestChapters();
  }, []);

  const fetchLatestChapters = async () => {
    const { data, error } = await supabase
      .from("chapters")
      .select(
        `
        id,
        chapter_number,
        title,
        release_date,
        manga:manga_id (
          id,
          slug,
          title,
          cover_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(12);

    if (!error && data) {
      setChapters(data as any);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {chapters.map((chapter) => (
        <Link
          key={chapter.id}
          to={`/manga/${chapter.manga.slug}`}
          className="group"
        >
          <Card className="flex gap-4 p-4 border-border bg-card hover:shadow-manga-card-hover transition-all duration-300 hover:border-primary/50">
            {/* Cover Image */}
            <div className="relative w-16 h-20 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
              <img
                src={chapter.manga.cover_url}
                alt={chapter.manga.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            {/* Chapter Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                {chapter.manga.title}
              </h4>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="line-clamp-1">
                  الفصل {chapter.chapter_number}
                </span>
              </div>

              {chapter.release_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(chapter.release_date).toLocaleDateString('ar-SA')}</span>
                </div>
              )}

              <Badge className="mt-2 bg-accent/20 text-accent-foreground hover:bg-accent/30">
                جديد
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
};
