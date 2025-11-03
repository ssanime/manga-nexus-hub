import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Clock, BookOpen } from "lucide-react";
import { Badge } from "./ui/badge";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  release_date: string | null;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
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
      {chapters.map((chapter) => {
        const manga = chapter.manga;
        
        return (
          <Link
            key={chapter.id}
            to={`/read/${manga.slug}/${chapter.chapter_number}`}
          >
            <Card className="border-border bg-card hover:shadow-manga-card-hover transition-all duration-300 hover:border-primary/50 overflow-hidden group cursor-pointer">
              <div className="flex gap-4 p-4">
                {/* Cover Image */}
                <div className="relative w-20 h-28 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                  {manga.cover_url ? (
                    <img
                      src={manga.cover_url}
                      alt={manga.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Chapter Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  {/* Manga Title */}
                  <h3 className="font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {manga.title}
                  </h3>
                  
                  {/* Chapter Number */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>
                        الفصل {chapter.chapter_number}
                        {chapter.title && `: ${chapter.title}`}
                      </span>
                    </div>
                    
                    {chapter.release_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(chapter.release_date).toLocaleDateString('ar-SA', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* New Badge */}
                  <div className="mt-2">
                    <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30 text-xs">
                      جديد
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
