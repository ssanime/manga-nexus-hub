import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Clock, BookOpen, Eye } from "lucide-react";
import { Badge } from "./ui/badge";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  release_date: string | null;
  views: number;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
  };
}

interface ChapterGroup {
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
  };
  chapters: Chapter[];
}

export const LatestChapters = () => {
  const [chapterGroups, setChapterGroups] = useState<ChapterGroup[]>([]);

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
        views,
        manga:manga_id (
          id,
          slug,
          title,
          cover_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(24);

    if (!error && data) {
      const mangaMap = new Map<string, ChapterGroup>();
      
      (data as any[]).forEach((chapter) => {
        const mangaId = chapter.manga.id;
        
        if (!mangaMap.has(mangaId)) {
          mangaMap.set(mangaId, {
            manga: chapter.manga,
            chapters: []
          });
        }
        
        const group = mangaMap.get(mangaId)!;
        if (group.chapters.length < 2) {
          group.chapters.push(chapter);
        }
      });

      setChapterGroups(Array.from(mangaMap.values()));
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ar-SA', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {chapterGroups.map((group) => (
        <Card 
          key={group.manga.id}
          className="border-border bg-card hover:shadow-manga-card-hover transition-all duration-300 hover:border-primary/50 overflow-hidden group"
        >
          <div className="relative h-64 overflow-hidden bg-secondary">
            {group.manga.cover_url ? (
              <img
                src={group.manga.cover_url}
                alt={group.manga.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
            
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-bold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {group.manga.title}
              </h3>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {group.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/read/${group.manga.slug}/${chapter.chapter_number}`}
                className="block"
              >
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        الفصل {chapter.chapter_number}
                      </p>
                      {chapter.title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chapter.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                    {chapter.views > 0 && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{chapter.views}</span>
                      </div>
                    )}
                    {chapter.release_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(chapter.release_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            
            {group.chapters.length > 0 && (
              <div className="pt-2">
                <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30 text-xs w-full justify-center">
                  جديد • {group.chapters.length} {group.chapters.length === 1 ? 'فصل' : 'فصول'}
                </Badge>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
