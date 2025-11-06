import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, BookOpen, Eye } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const LatestWorks = () => {
  const [manga, setManga] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 25; // 5x5 grid

  useEffect(() => {
    fetchLatestWorks();
  }, [currentPage]);

  const fetchLatestWorks = async () => {
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { count } = await supabase
      .from("manga")
      .select("*", { count: "exact", head: true })
      .eq("publish_status", "published");

    if (count) {
      setTotalPages(Math.ceil(count / itemsPerPage));
    }

    const { data, error } = await supabase
      .from("manga")
      .select("*")
      .eq("publish_status", "published")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data && !error) {
      setManga(data);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {manga.map((item) => (
          <Link key={item.id} to={`/manga/${item.slug}`}>
            <Card className="overflow-hidden group cursor-pointer hover:shadow-manga-glow transition-all border-border">
              <div className="relative h-72 overflow-hidden bg-secondary">
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {item.is_featured && (
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    مميزة
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-foreground line-clamp-2 text-sm">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3 w-3 text-accent fill-accent" />
                    <span>{item.rating || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>{formatViews(item.views || 0)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.chapter_count || 0} فصل
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={
                  currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
