import { Link } from "react-router-dom";
import { Star, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MangaCardProps {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  rating?: number;
  latestChapter?: string;
  genres?: string[];
  isNew?: boolean;
}

export const MangaCard = ({
  id,
  slug,
  title,
  coverUrl,
  rating = 0,
  latestChapter,
  genres = [],
  isNew = false,
}: MangaCardProps) => {
  return (
    <Link to={`/manga/${slug}`}>
      <Card className="group relative overflow-hidden border-border bg-card transition-all duration-300 hover:shadow-manga-card-hover hover:scale-[1.02]">
        {/* Cover Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* New Badge */}
          {isNew && (
            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
              جديد
            </Badge>
          )}

          {/* Rating */}
          {rating > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="text-xs font-semibold text-foreground">{rating}</span>
            </div>
          )}

          {/* Latest Chapter */}
          {latestChapter && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{latestChapter}</span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4">
          <h3 className="font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.slice(0, 3).map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="text-xs bg-secondary/50"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};
