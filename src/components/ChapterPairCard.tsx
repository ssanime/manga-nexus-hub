import { Link } from "react-router-dom";
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

interface ChapterPairCardProps {
  chapters: [Chapter] | [Chapter, Chapter];
}

export const ChapterPairCard = ({ chapters }: ChapterPairCardProps) => {
  const manga = chapters[0].manga;
  
  return (
    <Card className="border-border bg-card hover:shadow-manga-card-hover transition-all duration-300 hover:border-primary/50 overflow-hidden group">
      <div className="flex gap-4 p-4">
        {/* Cover Image */}
        <Link 
          to={`/manga/${manga.slug}`}
          className="relative w-24 h-32 flex-shrink-0 overflow-hidden rounded-md bg-secondary"
        >
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
        </Link>

        {/* Chapters Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Manga Title */}
          <Link 
            to={`/manga/${manga.slug}`}
            className="font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors"
          >
            {manga.title}
          </Link>
          
          {/* Chapters */}
          <div className="space-y-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/read/${manga.slug}/${chapter.chapter_number}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="line-clamp-1">
                        الفصل {chapter.chapter_number}
                        {chapter.title && `: ${chapter.title}`}
                      </span>
                    </div>
                  </div>
                  
                  {chapter.release_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span className="whitespace-nowrap">
                        {new Date(chapter.release_date).toLocaleDateString('ar-SA', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* New Badge */}
          <div className="flex gap-2 mt-2">
            <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30 text-xs">
              جديد
            </Badge>
            {chapters.length === 2 && (
              <Badge variant="outline" className="text-xs">
                فصلين
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
