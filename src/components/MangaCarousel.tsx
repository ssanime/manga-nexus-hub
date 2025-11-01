import { useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface MangaCarouselProps {
  manga: any[];
  size?: "large" | "medium";
}

export const MangaCarousel = ({ manga, size = "medium" }: MangaCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: "start",
    skipSnaps: false,
    dragFree: true
  });

  // Auto scroll
  useEffect(() => {
    if (!emblaApi) return;

    const autoScroll = setInterval(() => {
      emblaApi.scrollNext();
    }, 3000);

    return () => clearInterval(autoScroll);
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  const isLarge = size === "large";

  return (
    <div className="relative group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {manga.map((item) => (
            <div
              key={item.id}
              className={`flex-shrink-0 ${
                isLarge
                  ? "w-[280px] md:w-[320px]"
                  : "w-[160px] md:w-[200px]"
              }`}
            >
              <Link to={`/manga/${item.slug}`}>
                <Card className="group/card relative overflow-hidden border-border bg-card transition-all duration-300 hover:shadow-manga-card-hover hover:scale-[1.02]">
                  {/* Cover Image */}
                  <div
                    className={`relative overflow-hidden bg-secondary ${
                      isLarge ? "aspect-[3/4]" : "aspect-[3/4]"
                    }`}
                  >
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                    {/* Rating */}
                    {item.rating && item.rating > 0 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        <span className="text-xs font-semibold text-foreground">
                          {item.rating}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    {item.status && (
                      <Badge className="absolute top-2 right-2 bg-primary/80 text-primary-foreground">
                        {item.status === "ongoing" ? "مستمر" : "مكتمل"}
                      </Badge>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className={`p-3 ${isLarge ? "md:p-4" : ""}`}>
                    <h3
                      className={`font-bold text-foreground line-clamp-2 group-hover/card:text-primary transition-colors ${
                        isLarge ? "text-base md:text-lg mb-2" : "text-sm mb-1"
                      }`}
                    >
                      {item.title}
                    </h3>

                    {/* Genres */}
                    {item.genres && item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.genres.slice(0, 2).map((genre: string) => (
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
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm border-border hover:bg-primary hover:text-primary-foreground"
        onClick={scrollPrev}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm border-border hover:bg-primary hover:text-primary-foreground"
        onClick={scrollNext}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
    </div>
  );
};
